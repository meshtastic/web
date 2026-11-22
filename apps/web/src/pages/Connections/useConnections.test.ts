import type { Connection } from "@app/core/stores/deviceStore/types";
import { create, toBinary } from "@bufbuild/protobuf";
import { FakeKmpClient } from "@core/kmp/fakeClient.ts";
import { meshRegistry } from "@core/kmp/registry.ts";
import { Protobuf } from "@core/protobuf.ts";
import type { StorageScope } from "@core/storage/scope.ts";
import { useDeviceStore } from "@core/stores";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useConnections } from "./useConnections.ts";

// The storage scope each sqlocal repository was opened with, and the scopes
// it was switched to, in order, per repository kind.
const scopes = vi.hoisted(
  (): {
    opened: Array<[string, StorageScope]>;
    switched: Array<[string, number]>;
  } => ({ opened: [], switched: [] }),
);

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: async () => ({
    db: {},
    persistent: true,
    atomic: async () => {},
  }),
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
  return { createSerialClient: async () => new FakeKmpClient() };
});

// The sqlocal repositories, replaced by empty ones that record the scopes
// they are given. Called with `new`; the returned object is the instance.
function recording(kind: string) {
  return function Recording(_db: unknown, options: { scope: StorageScope }) {
    scopes.opened.push([kind, options.scope]);
    return {
      setScope(scope: number): void {
        scopes.switched.push([kind, scope]);
      },
      loadAll: async () => [],
      loadRecent: async () => [],
      load: async () => "",
      append: async () => {},
      upsert: async () => {},
      upsertBatch: async () => {},
      prune: async () => {},
    };
  };
}

vi.mock("@core/storage/messages.ts", () => ({
  SqlocalMessageRepository: recording("messages"),
}));
vi.mock("@core/storage/drafts.ts", () => ({
  SqlocalDraftRepository: recording("drafts"),
}));
vi.mock("@core/storage/nodes.ts", () => ({
  SqlocalNodesRepository: recording("nodes"),
}));
vi.mock("@core/storage/telemetry.ts", () => ({
  SqlocalTelemetryRepository: recording("telemetry"),
}));

const NODE = 0x0a0b0c0d;
const KINDS = ["messages", "drafts", "nodes", "telemetry"];

const saved = (id: number): Connection | undefined =>
  useDeviceStore.getState().savedConnections.find((c) => c.id === id);

function kmpFor(id: number): FakeKmpClient {
  const kmp = meshRegistry.get(id)?.kmp;
  if (!(kmp instanceof FakeKmpClient)) throw new Error("no session");
  return kmp;
}

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

describe("useConnections storage scope", () => {
  afterEach(() => {
    scopes.opened.length = 0;
    scopes.switched.length = 0;
  });

  /** The one scope every repository of the latest connect shares. */
  function sharedScope(): StorageScope {
    const [first] = scopes.opened;
    if (!first) throw new Error("no repositories opened");
    expect(scopes.opened.map(([kind]) => kind)).toEqual(KINDS);
    for (const [, scope] of scopes.opened) expect(scope).toBe(first[1]);
    return first[1];
  }

  it("saves the node number on the connection and files history under it once named", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "Serial",
    });
    expect(conn.nodeNum).toBeUndefined();

    await act(() => result.current.connect(conn.id));
    const first = sharedScope();
    expect(first.provisional).toBe(true);

    act(() => kmpFor(conn.id).emitFrame(myInfo(NODE)));
    expect(saved(conn.id)?.nodeNum).toBe(NODE);
    // The session moves to the node's history straight away.
    expect(first.deviceId).toBe(NODE);
    expect(scopes.switched).toEqual(KINDS.map((kind) => [kind, NODE]));

    await act(() => result.current.disconnect(conn.id));
    scopes.opened.length = 0;
    scopes.switched.length = 0;

    // The next connect does not assume the port still leads to that radio:
    // it starts provisional again, under a scope of its own.
    await act(() => result.current.connect(conn.id));
    const second = sharedScope();
    expect(second.provisional).toBe(true);
    expect(second.deviceId).not.toBe(first.deviceId);

    act(() => kmpFor(conn.id).emitFrame(myInfo(NODE)));
    expect(second.deviceId).toBe(NODE);
    expect(saved(conn.id)?.nodeNum).toBe(NODE);

    // my_info again for the same node changes nothing.
    scopes.switched.length = 0;
    act(() => kmpFor(conn.id).emitFrame(myInfo(NODE)));
    expect(scopes.switched).toEqual([]);

    await act(() => result.current.disconnect(conn.id));
  });
});
