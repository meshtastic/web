import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeTransport } from "../testing/createFakeTransport.ts";
import { MeshClient } from "./MeshClient.ts";
import { CONFIG_NONCE, NODEDB_NONCE } from "./handshake.ts";

describe("MeshClient.progress", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in the idle phase before configure() is called", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    expect(client.progress.value.phase).toBe("idle");
  });

  it("flips to configuring with empty counters when configure() runs", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    client.configure().catch(() => {});
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
    client.configure().catch(() => {});

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

  it("flips to configured only after the NodeDB stage completes", async () => {
    vi.useFakeTimers();
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport, heartbeatIntervalMs: false });
    client.configure().catch(() => {});
    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    client.events.onConfigComplete.dispatch(CONFIG_NONCE);
    expect(client.progress.value.phase).toBe("configuring");

    await vi.advanceTimersByTimeAsync(1_000);
    client.events.onConfigComplete.dispatch(NODEDB_NONCE);

    const cur = client.progress.value;
    expect(cur.phase).toBe("configured");
    if (cur.phase !== "configured") throw new Error("unreachable");
    expect(cur.received.config).toBe(1);
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

  it("resets counters when configure() runs again", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    client.configure().catch(() => {});
    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    client.events.onConfigComplete.dispatch(CONFIG_NONCE);
    client.configure().catch(() => {});
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
