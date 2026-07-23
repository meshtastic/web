import { create, fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it, vi } from "vitest";
import { createFakeTransport } from "../testing/createFakeTransport.ts";
import { MeshClient } from "./MeshClient.ts";

describe("MeshClient.progress", () => {
  const CONFIG_ONLY_NONCE = 69420;
  const NODES_ONLY_NONCE = 69421;

  it("starts in the idle phase before configure() is called", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    expect(client.progress.value.phase).toBe("idle");
  });

  it("flips to configuring with empty counters when configure() runs", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    void client.configure();
    expect(client.progress.value.phase).toBe("configuring");
    expect(client.progress.value).toEqual({
      phase: "configuring",
      received: {
        config: 0,
        modules: 0,
        channels: 0,
        nodes: 0,
        myInfo: false,
        metadata: false,
      },
    });
  });

  it("tallies inbound packets onto the configuring counters", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    void client.configure();

    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    client.events.onChannelPacket.dispatch(
      create(Protobuf.Channel.ChannelSchema, {}),
    );
    client.events.onNodeInfoPacket.dispatch(
      create(Protobuf.Mesh.NodeInfoSchema, {}),
    );
    client.events.onMyNodeInfo.dispatch(
      create(Protobuf.Mesh.MyNodeInfoSchema, {}),
    );

    const cur = client.progress.value;
    if (cur.phase !== "configuring")
      throw new Error("expected configuring phase");
    expect(cur.received.config).toBe(2);
    expect(cur.received.channels).toBe(1);
    expect(cur.received.nodes).toBe(1);
    expect(cur.received.myInfo).toBe(true);
    expect(cur.received.modules).toBe(0);
  });

  it("requests config and nodes in separate firmware-compatible stages", async () => {
    const { transport, respond, sent } = createFakeTransport();
    const client = new MeshClient({ transport });

    await client.configure();

    const initialPackets = sent.map(
      (packet) =>
        fromBinary(Protobuf.Mesh.ToRadioSchema, packet).payloadVariant,
    );
    expect(initialPackets[0]?.case).toBe("heartbeat");
    expect(initialPackets[1]).toEqual({
      case: "wantConfigId",
      value: CONFIG_ONLY_NONCE,
    });

    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    respond.withConfigCompleteId(CONFIG_ONLY_NONCE);

    await vi.waitFor(() => {
      expect(sent).toHaveLength(3);
    });
    expect(
      fromBinary(Protobuf.Mesh.ToRadioSchema, sent[2]!).payloadVariant,
    ).toEqual({ case: "wantConfigId", value: NODES_ONLY_NONCE });
    expect(client.progress.value.phase).toBe("configuring");

    respond.withConfigCompleteId(NODES_ONLY_NONCE);

    await vi.waitFor(() => {
      expect(client.progress.value.phase).toBe("configured");
    });

    const cur = client.progress.value;
    expect(cur.phase).toBe("configured");
    if (cur.phase !== "configured") throw new Error("unreachable");
    expect(cur.received.config).toBe(1);
  });

  it("ignores stale and out-of-order config completion nonces", async () => {
    const { transport, respond, sent } = createFakeTransport();
    const client = new MeshClient({ transport });
    const completed: number[] = [];
    client.events.onConfigComplete.subscribe((id) => completed.push(id));

    await client.configure();
    respond.withConfigCompleteId(NODES_ONLY_NONCE);
    respond.withConfigCompleteId(12345);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent).toHaveLength(2);
    expect(client.progress.value.phase).toBe("configuring");
    expect(completed).toEqual([]);
  });

  it("ignores packets that arrive while idle (post-completion)", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    // not calling configure() — phase is idle
    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    expect(client.progress.value.phase).toBe("idle");
  });

  it("resets counters when configure() runs again", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    await client.configure();
    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    void client.configure();
    expect(client.progress.value).toEqual({
      phase: "configuring",
      received: {
        config: 0,
        modules: 0,
        channels: 0,
        nodes: 0,
        myInfo: false,
        metadata: false,
      },
    });
  });
});
