import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlocalDb } from "./db.ts";
import { SqlocalDeviceStorage } from "./deviceStorage.ts";
import { createMemoryDb } from "./memoryDb.ts";
import { SqlocalNodesRepository } from "./nodes.ts";

const NODE = 0x0a0b0c0d;

const nodeInfo = (num: number, longName: string) =>
  toBinary(
    Protobuf.Mesh.NodeInfoSchema,
    create(Protobuf.Mesh.NodeInfoSchema, {
      num,
      lastHeard: 1234,
      isFavorite: true,
      user: create(Protobuf.Mesh.UserSchema, { longName }),
    }),
  );

const bundle = () => ({
  myInfo: toBinary(
    Protobuf.Mesh.MyNodeInfoSchema,
    create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: NODE }),
  ),
  metadata: toBinary(
    Protobuf.Mesh.DeviceMetadataSchema,
    create(Protobuf.Mesh.DeviceMetadataSchema, { firmwareVersion: "2.8.3" }),
  ),
  configs: [
    toBinary(
      Protobuf.Config.ConfigSchema,
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: { case: "lora", value: { region: 4 } },
      }),
    ),
  ],
  moduleConfigs: [],
  deviceUiConfig: null,
});

describe("SqlocalDeviceStorage", () => {
  let db: SqlocalDb;
  let storage: SqlocalDeviceStorage;

  beforeEach(async () => {
    db = await createMemoryDb();
    storage = new SqlocalDeviceStorage(db, NODE);
  });

  it("round-trips nodes and keeps the web's node repository reading them", async () => {
    await storage.saveNode(nodeInfo(1, "one"));
    await storage.saveNode(nodeInfo(2, "two"));
    await storage.saveNode(nodeInfo(1, "uno"));
    const loaded = (await storage.loadNodes()).map((bytes) =>
      fromBinary(Protobuf.Mesh.NodeInfoSchema, bytes),
    );
    expect(loaded.map((n) => [n.num, n.user?.longName, n.isFavorite])).toEqual([
      [1, "uno", true],
      [2, "two", true],
    ]);

    const web = new SqlocalNodesRepository(db, { deviceId: NODE });
    expect((await web.get(1))?.user?.longName).toBe("uno");

    await storage.removeNode(1);
    expect((await storage.loadNodes()).length).toBe(1);
  });

  it("round-trips the config bundle and channels", async () => {
    expect(await storage.loadConfig()).toBeNull();
    await storage.saveConfig(bundle());
    const config = await storage.loadConfig();
    expect(
      fromBinary(
        Protobuf.Mesh.MyNodeInfoSchema,
        config?.myInfo ?? new Uint8Array(),
      ).myNodeNum,
    ).toBe(NODE);
    expect(config?.configs).toHaveLength(1);
    expect(config?.deviceUiConfig).toBeNull();

    const channel = (index: number) =>
      toBinary(
        Protobuf.Channel.ChannelSchema,
        create(Protobuf.Channel.ChannelSchema, { index }),
      );
    await storage.saveChannels([channel(0), channel(1)]);
    await storage.saveChannels([channel(0)]);
    expect(await storage.loadChannels()).toEqual([channel(0)]);
  });

  it("keeps heartbeats and an unexpired passkey", async () => {
    await storage.saveHeartbeat(7, 1000);
    await storage.saveHeartbeat(7, 2000);
    await storage.saveHeartbeat(8, 3000);
    expect(await storage.loadHeartbeats()).toEqual([
      { nodeNum: 7, epochMillis: 2000 },
      { nodeNum: 8, epochMillis: 3000 },
    ]);

    expect(await storage.loadSessionPasskey()).toBeNull();
    await storage.saveSessionPasskey({
      bytes: new Uint8Array([1, 2]),
      expiresAtEpochMs: Date.now() + 60_000,
    });
    expect((await storage.loadSessionPasskey())?.bytes).toEqual(
      new Uint8Array([1, 2]),
    );
    await storage.saveSessionPasskey({
      bytes: new Uint8Array([3]),
      expiresAtEpochMs: Date.now() - 1,
    });
    expect(await storage.loadSessionPasskey()).toBeNull();
  });

  it("moves to the node the handshake names instead of wiping", async () => {
    const unknown = new SqlocalDeviceStorage(db, -1);
    await storage.saveNode(nodeInfo(1, "known"));
    expect(await unknown.loadNodes()).toEqual([]);
    await unknown.recordOwnNode(NODE, "2.8.3");
    expect((await unknown.loadNodes()).length).toBe(1);

    await unknown.clear();
    expect(await storage.loadNodes()).toEqual([]);
  });
});
