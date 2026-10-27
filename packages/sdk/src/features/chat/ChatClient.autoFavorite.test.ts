import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it, vi } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";
import { Result } from "better-result";

const MY_NODE = 0xdeadbeef;

function setMyNode(client: MeshClient): void {
  client.events.onMyNodeInfo.dispatch(
    create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: MY_NODE }),
  );
}

function setDeviceRole(
  client: MeshClient,
  role: Protobuf.Config.Config_DeviceConfig_Role,
): void {
  client.events.onConfigPacket.dispatch(
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "device",
        value: create(Protobuf.Config.Config_DeviceConfigSchema, { role }),
      },
    }),
  );
}

function dispatchDirectMessage(
  client: MeshClient,
  opts: { from: number; to: number; ms: number },
): void {
  client.events.onMessagePacket.dispatch({
    id: opts.ms,
    from: opts.from,
    to: opts.to,
    channel: ChannelNumber.Primary,
    type: "direct",
    rxTime: new Date(opts.ms),
    data: "hello",
  } as never);
}

describe("ChatClient auto-favorite on direct message", () => {
  it("auto-favorites the peer on inbound direct message", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    setMyNode(client);
    setDeviceRole(client, Protobuf.Config.Config_DeviceConfig_Role.CLIENT);

    const favoriteSpy = vi
      .spyOn(client.nodes, "favorite")
      .mockResolvedValue(Result.ok(1));

    dispatchDirectMessage(client, { from: 100, to: MY_NODE, ms: 1000 });

    expect(favoriteSpy).toHaveBeenCalledWith(100);
  });

  it("skips auto-favorite when peer is already favorited", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    setMyNode(client);
    setDeviceRole(client, Protobuf.Config.Config_DeviceConfig_Role.CLIENT);

    client.events.onNodeInfoPacket.dispatch(
      create(Protobuf.Mesh.NodeInfoSchema, {
        num: 100,
        isFavorite: true,
      }),
    );

    const favoriteSpy = vi
      .spyOn(client.nodes, "favorite")
      .mockResolvedValue(Result.ok(1));

    dispatchDirectMessage(client, { from: 100, to: MY_NODE, ms: 1000 });

    expect(favoriteSpy).not.toHaveBeenCalled();
  });

  it("does not auto-favorite when local role is CLIENT_BASE", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    setMyNode(client);
    setDeviceRole(client, Protobuf.Config.Config_DeviceConfig_Role.CLIENT_BASE);

    const favoriteSpy = vi
      .spyOn(client.nodes, "favorite")
      .mockResolvedValue(Result.ok(1));

    dispatchDirectMessage(client, { from: 200, to: MY_NODE, ms: 1000 });

    expect(favoriteSpy).not.toHaveBeenCalled();
  });

  it("calls favorite only once for repeated messages from the same peer", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    setMyNode(client);
    setDeviceRole(client, Protobuf.Config.Config_DeviceConfig_Role.CLIENT);

    const favoriteSpy = vi
      .spyOn(client.nodes, "favorite")
      .mockResolvedValue(Result.ok(1));

    dispatchDirectMessage(client, { from: 100, to: MY_NODE, ms: 1000 });
    dispatchDirectMessage(client, { from: 100, to: MY_NODE, ms: 2000 });
    dispatchDirectMessage(client, { from: 100, to: MY_NODE, ms: 3000 });

    expect(favoriteSpy).toHaveBeenCalledTimes(1);
  });

  it("auto-favorites the peer on outbound direct message via send()", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    setMyNode(client);
    setDeviceRole(client, Protobuf.Config.Config_DeviceConfig_Role.CLIENT);

    const favoriteSpy = vi
      .spyOn(client.nodes, "favorite")
      .mockResolvedValue(Result.ok(1));

    const flush = setInterval(() => {
      for (const item of client.queue.getState())
        client.queue.processAck(item.id);
    }, 5);
    try {
      await client.chat.send({ text: "hey", destination: 300 });
    } finally {
      clearInterval(flush);
    }

    expect(favoriteSpy).toHaveBeenCalledWith(300);
  });
});
