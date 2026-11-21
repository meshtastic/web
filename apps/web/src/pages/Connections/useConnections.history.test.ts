import { create, toBinary } from "@bufbuild/protobuf";
import { type FakeKmpClient, state } from "@core/kmp/fakeClient.ts";
import { meshRegistry } from "@core/kmp/registry.ts";
import type { MeshSession } from "@core/kmp/session.ts";
import { Protobuf } from "@core/protobuf.ts";
import { useDeviceStore } from "@core/stores";
import type { SqlocalDb } from "@core/storage/db.ts";
import type { RunAtomically } from "@core/storage/adopt.ts";
import { createMemoryStorage } from "@core/storage/memoryDb.ts";
import * as schema from "@core/storage/schema.ts";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConnections } from "./useConnections.ts";

const storage = vi.hoisted(
  (): { db?: SqlocalDb; atomic?: RunAtomically } => ({}),
);
const kmp = vi.hoisted((): { clients: FakeKmpClient[] } => ({ clients: [] }));

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: async () => {
    if (!storage.db || !storage.atomic) throw new Error("no storage");
    return { db: storage.db, persistent: true, atomic: storage.atomic };
  },
  closeStorageDb: async () => {},
  coordinator: undefined,
}));

vi.mock("@core/kmp/browserStorage.ts", () => ({
  getSdkStorage: async () => {
    throw new Error("no SDK storage in tests");
  },
  resetSdkStorage: () => {},
}));

vi.mock("@core/kmp/client.ts", async () => {
  const { FakeKmpClient } = await import("@core/kmp/fakeClient.ts");
  const make = async () => {
    const client = new FakeKmpClient();
    kmp.clients.push(client);
    return client;
  };
  return { createHttpClient: make, createSerialClient: make };
});

const RADIO = 0x0a0b0c0d;
const OTHER_RADIO = 0x01020304;
const PEER = 0x11223344;
const BROADCAST = 0xffffffff;

const myInfo = (myNodeNum: number): Uint8Array =>
  toBinary(
    Protobuf.Mesh.FromRadioSchema,
    create(Protobuf.Mesh.FromRadioSchema, {
      payloadVariant: {
        case: "myInfo",
        value: create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum }),
      },
    }),
  );

let packetId = 1000;
const text = (body: string, from = PEER): Uint8Array =>
  toBinary(
    Protobuf.Mesh.MeshPacketSchema,
    create(Protobuf.Mesh.MeshPacketSchema, {
      id: packetId++,
      from,
      to: BROADCAST,
      channel: 0,
      rxTime: Math.floor(Date.now() / 1000),
      payloadVariant: {
        case: "decoded",
        value: create(Protobuf.Mesh.DataSchema, {
          portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
          payload: new TextEncoder().encode(body),
        }),
      },
    }),
  );

const telemetry = (from: number): Uint8Array =>
  toBinary(
    Protobuf.Mesh.MeshPacketSchema,
    create(Protobuf.Mesh.MeshPacketSchema, {
      id: packetId++,
      from,
      to: BROADCAST,
      rxTime: Math.floor(Date.now() / 1000),
      payloadVariant: {
        case: "decoded",
        value: create(Protobuf.Mesh.DataSchema, {
          portnum: Protobuf.Portnums.PortNum.TELEMETRY_APP,
          payload: toBinary(
            Protobuf.Telemetry.TelemetrySchema,
            create(Protobuf.Telemetry.TelemetrySchema, {
              variant: {
                case: "deviceMetrics",
                value: create(Protobuf.Telemetry.DeviceMetricsSchema, {
                  batteryLevel: 77,
                }),
              },
            }),
          ),
        }),
      },
    }),
  );

const CHANNEL_0 = { kind: "channel", channel: 0 } as const;

function session(id: number): MeshSession {
  const s = meshRegistry.get(id);
  if (!s) throw new Error(`no session for ${id}`);
  return s;
}

function lastClient(): FakeKmpClient {
  const client = kmp.clients.at(-1);
  if (!client) throw new Error("no client created");
  return client;
}

async function settle(s: MeshSession): Promise<void> {
  await act(async () => {
    await s.chat.flush();
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function rowsFor(deviceId: number) {
  const db = storage.db;
  if (!db) throw new Error("no db");
  const all = await db.select().from(schema.messages);
  const drafts = await db.select().from(schema.drafts);
  const nodes = await db.select().from(schema.nodes);
  const readings = await db.select().from(schema.telemetry);
  return {
    messages: all.filter((r) => r.deviceId === deviceId).map((r) => r.text),
    drafts: drafts.filter((r) => r.deviceId === deviceId).map((r) => r.text),
    nodes: nodes.filter((r) => r.deviceId === deviceId).map((r) => r.num),
    telemetry: readings
      .filter((r) => r.deviceId === deviceId)
      .map((r) => r.nodeNum),
  };
}

async function provisionalRows(): Promise<number> {
  const db = storage.db;
  if (!db) throw new Error("no db");
  const tables = await Promise.all([
    db.select().from(schema.messages),
    db.select().from(schema.drafts),
    db.select().from(schema.nodes),
    db.select().from(schema.telemetry),
  ]);
  return tables.flat().filter((r) => r.deviceId < 0).length;
}

describe("history follows the radio, not the transport", () => {
  beforeEach(async () => {
    const opened = await createMemoryStorage();
    storage.db = opened.db;
    storage.atomic = opened.atomic;
    kmp.clients = [];
    useDeviceStore.setState({ savedConnections: [] });
  });

  it("shows history written over HTTP on a new serial connection to the same radio", async () => {
    const { result } = renderHook(() => useConnections());
    const http = result.current.addConnection({
      type: "http",
      name: "Radio over Wi-Fi",
      url: "http://192.168.1.10",
    });
    await act(() => result.current.connect(http.id));
    act(() => lastClient().emitFrame(myInfo(RADIO)));
    act(() => lastClient().emitPacket(text("hello over http")));
    act(() => session(http.id).chat.drafts.set(CHANNEL_0, "half typed"));
    await settle(session(http.id));
    await act(() => result.current.disconnect(http.id));

    const serial = result.current.addConnection({
      type: "serial",
      name: "Radio over USB",
      usbVendorId: 0x303a,
      usbProductId: 0x1001,
    });
    await act(() => result.current.connect(serial.id));
    const viaSerial = session(serial.id);
    const thread = viaSerial.chat.thread(CHANNEL_0);
    const draft = viaSerial.chat.drafts.get(CHANNEL_0);
    act(() => lastClient().emitFrame(myInfo(RADIO)));
    await settle(viaSerial);

    await waitFor(() =>
      expect(thread.value.map((m) => m.message.text)).toEqual([
        "hello over http",
      ]),
    );
    await waitFor(() => expect(draft.value).toBe("half typed"));
    await waitFor(() =>
      expect([...viaSerial.chat.summaries.value.keys()]).toEqual(["channel:0"]),
    );
    expect(viaSerial.nodes.byNum(PEER)).toBeDefined();
    expect(
      useDeviceStore.getState().savedConnections.map((c) => c.nodeNum),
    ).toEqual([RADIO, RADIO]);
  });

  it("files what this connection stored before the radio was named under the radio", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "USB",
      usbVendorId: 0x303a,
      usbProductId: 0x1001,
    });
    await act(() => result.current.connect(conn.id));
    const s = session(conn.id);
    const thread = s.chat.thread(CHANNEL_0);
    act(() => lastClient().emitPacket(text("before my_info")));
    act(() => lastClient().emitPacket(telemetry(PEER)));
    act(() => s.chat.drafts.set(CHANNEL_0, "early draft"));
    await settle(s);
    act(() => lastClient().emitFrame(myInfo(RADIO)));
    await settle(s);

    await waitFor(async () =>
      expect(await rowsFor(RADIO)).toMatchObject({
        messages: ["before my_info"],
        drafts: ["early draft"],
        telemetry: [PEER],
      }),
    );
    expect((await rowsFor(RADIO)).nodes).toContain(PEER);
    expect(await provisionalRows()).toBe(0);
    // The reload after naming the radio still shows what came before it.
    await waitFor(() =>
      expect(thread.value.map((m) => m.message.text)).toEqual([
        "before my_info",
      ]),
    );
    expect(s.chat.drafts.get(CHANNEL_0).value).toBe("early draft");
  });

  it("names the radio from the SDK when my_info never reached the web", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "http",
      name: "Radio",
      url: "http://192.168.1.10",
    });
    await act(() => result.current.connect(conn.id));
    const client = lastClient();
    act(() => client.emitPacket(text("early")));
    await settle(session(conn.id));
    client.myNodeNum = RADIO;
    act(() => client.setState(state("connected")));
    await settle(session(conn.id));

    await waitFor(async () =>
      expect((await rowsFor(RADIO)).messages).toEqual(["early"]),
    );
  });

  it("drops what a connection stored when it ends before the radio is named", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "http",
      name: "Radio",
      url: "http://192.168.1.10",
    });
    await act(() => result.current.connect(conn.id));
    act(() => lastClient().emitPacket(text("nobody's")));
    await settle(session(conn.id));
    expect(await provisionalRows()).toBeGreaterThan(0);

    await act(() => result.current.disconnect(conn.id));

    await waitFor(async () => expect(await provisionalRows()).toBe(0));
  });

  it("does not file another radio's history under the radio this connection reached last time", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "USB",
      usbVendorId: 0x303a,
      usbProductId: 0x1001,
    });
    await act(() => result.current.connect(conn.id));
    act(() => lastClient().emitFrame(myInfo(OTHER_RADIO)));
    act(() => lastClient().emitPacket(text("other radio's")));
    await settle(session(conn.id));
    await act(() => result.current.disconnect(conn.id));
    expect(
      useDeviceStore.getState().savedConnections.find((c) => c.id === conn.id)
        ?.nodeNum,
    ).toBe(OTHER_RADIO);

    // A different radio on the same port now.
    await act(() => result.current.connect(conn.id));
    const s = session(conn.id);
    act(() => lastClient().emitPacket(text("new radio's, early")));
    await settle(s);
    act(() => lastClient().emitFrame(myInfo(RADIO)));
    await settle(s);

    await waitFor(async () =>
      expect((await rowsFor(RADIO)).messages).toEqual(["new radio's, early"]),
    );
    expect((await rowsFor(OTHER_RADIO)).messages).toEqual(["other radio's"]);
    const thread = s.chat.thread(CHANNEL_0);
    await waitFor(() =>
      expect(thread.value.map((m) => m.message.text)).toEqual([
        "new radio's, early",
      ]),
    );
  });
});
