import { create } from "@bufbuild/protobuf";
import { UNKNOWN_NODE_SCOPE } from "@app/core/connections/sdkClient.ts";
import type { Connection } from "@app/core/stores/deviceStore/types";
import { useDeviceStore } from "@core/stores";
import { type MeshDevice, Protobuf } from "@meshtastic/sdk";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useConnections } from "./useConnections.ts";

// Every storage scope a sqlocal repository was opened with or switched to,
// in order, per repository kind.
const scopes = vi.hoisted(() => ({
  opened: [] as Array<[string, number]>,
  switched: [] as Array<[string, number]>,
}));

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: async () => ({ db: {}, persistent: true }),
  coordinator: undefined,
}));

vi.mock("@app/core/connections/transports.ts", () => ({
  openTransport: async () => ({
    transport: {
      toDevice: new WritableStream<Uint8Array>(),
      fromDevice: new ReadableStream(),
      disconnect: async () => {},
    },
  }),
  closeTransport: () => {},
  probeConnection: async () => ({ status: "disconnected" }),
}));

// The sqlocal repositories, replaced by the SDK's in-memory ones that record
// the scopes they are given. Called with `new`; the returned object is the
// instance.
function recording<T extends object>(kind: string, make: () => T) {
  return function Recording(_db: unknown, options: { deviceId: number }) {
    scopes.opened.push([kind, options.deviceId]);
    return Object.assign(make(), {
      setScope(scope: number): void {
        scopes.switched.push([kind, scope]);
      },
    });
  };
}

vi.mock("@meshtastic/sdk-storage-sqlocal/chat", async () => {
  const sdk = await import("@meshtastic/sdk");
  return {
    SqlocalMessageRepository: recording(
      "messages",
      () => new sdk.InMemoryMessageRepository(),
    ),
    SqlocalDraftRepository: recording(
      "drafts",
      () => new sdk.InMemoryDraftRepository(),
    ),
  };
});
vi.mock("@meshtastic/sdk-storage-sqlocal/nodes", async () => {
  const sdk = await import("@meshtastic/sdk");
  return {
    SqlocalNodesRepository: recording(
      "nodes",
      () => new sdk.InMemoryNodesRepository(),
    ),
  };
});
vi.mock("@meshtastic/sdk-storage-sqlocal/telemetry", async () => {
  const sdk = await import("@meshtastic/sdk");
  return {
    SqlocalTelemetryRepository: recording(
      "telemetry",
      () => new sdk.InMemoryTelemetryRepository(),
    ),
  };
});

const NODE = 0x0a0b0c0d;
const KINDS = ["messages", "drafts", "nodes", "telemetry"];

const saved = (id: number): Connection | undefined =>
  useDeviceStore.getState().savedConnections.find((c) => c.id === id);

function meshDeviceFor(id: number): MeshDevice {
  const meshDeviceId = saved(id)?.meshDeviceId;
  const device = meshDeviceId
    ? useDeviceStore.getState().getDevice(meshDeviceId)
    : undefined;
  if (!device?.connection) throw new Error("no MeshDevice for connection");
  return device.connection;
}

describe("useConnections storage scope", () => {
  afterEach(() => {
    scopes.opened.length = 0;
    scopes.switched.length = 0;
  });

  it("saves the node number on the connection and opens its history on the next connect", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "Serial",
    });
    expect(conn.nodeNum).toBeUndefined();

    await act(() => result.current.connect(conn.id));
    expect(scopes.opened).toEqual(
      KINDS.map((kind) => [kind, UNKNOWN_NODE_SCOPE]),
    );

    act(() => {
      meshDeviceFor(conn.id).events.onMyNodeInfo.dispatch(
        create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: NODE }),
      );
    });
    expect(saved(conn.id)?.nodeNum).toBe(NODE);
    // The SDK moves this session to the node straight away.
    expect(scopes.switched).toEqual(KINDS.map((kind) => [kind, NODE]));

    await act(() => result.current.disconnect(conn.id));
    scopes.opened.length = 0;
    scopes.switched.length = 0;

    await act(() => result.current.connect(conn.id));
    expect(scopes.opened).toEqual(KINDS.map((kind) => [kind, NODE]));

    // my_info for the same node changes nothing.
    act(() => {
      meshDeviceFor(conn.id).events.onMyNodeInfo.dispatch(
        create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: NODE }),
      );
    });
    expect(scopes.switched).toEqual([]);
    expect(saved(conn.id)?.nodeNum).toBe(NODE);

    await act(() => result.current.disconnect(conn.id));
  });
});
