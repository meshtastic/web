import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { createFakeTransport } from "../testing/createFakeTransport.ts";
import { MeshClient } from "./MeshClient.ts";

describe("MeshClient.progress", () => {
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

  it("flips to configured when onConfigComplete fires", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    void client.configure();
    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    client.events.onConfigComplete.dispatch(0);

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
    void client.configure();
    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {}),
    );
    client.events.onConfigComplete.dispatch(0);
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
