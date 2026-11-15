import { create, toBinary } from "@bufbuild/protobuf";
import { FakeKmpClient, state } from "@core/kmp/fakeClient.ts";
import type { Connection } from "@app/core/stores/deviceStore/types";
import { meshRegistry } from "@core/kmp/registry.ts";
import { useDeviceStore } from "@core/stores";
import { Protobuf } from "@core/protobuf.ts";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConnections } from "./useConnections.ts";

const kmp = vi.hoisted(
  (): { client?: FakeKmpClient; connectError?: Error } => ({}),
);

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: async () => {
    throw new Error("no storage in tests");
  },
  coordinator: undefined,
}));

vi.mock("@core/kmp/client.ts", async () => {
  const { FakeKmpClient } = await import("@core/kmp/fakeClient.ts");
  return {
    createHttpClient: async () => {
      const client = new FakeKmpClient();
      if (kmp.connectError) {
        const error = kmp.connectError;
        client.connect = async () => {
          throw error;
        };
      }
      kmp.client = client;
      return client;
    },
  };
});

const saved = (id: number): Connection | undefined =>
  useDeviceStore.getState().savedConnections.find((c) => c.id === id);

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

function named(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

describe("useConnections over the Kotlin SDK (HTTP)", () => {
  beforeEach(() => {
    kmp.client = undefined;
    kmp.connectError = undefined;
  });

  it("connects through the SDK and reads the handshake it ran", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "http",
      name: "Radio",
      url: "http://192.168.1.10",
    });

    const ok = await act(() => result.current.connect(conn.id));
    expect(ok).toBe(true);
    expect(saved(conn.id)?.status).toBe("configured");
    const client = kmp.client;
    if (!client) throw new Error("no client created");
    expect(meshRegistry.get(conn.id)?.kmp).toBe(client);
    act(() => client.emitFrame(myInfo(0x0a0b0c0d)));
    expect(saved(conn.id)?.nodeNum).toBe(0x0a0b0c0d);

    await act(() => result.current.disconnect(conn.id));
    expect(client.disconnects).toHaveLength(1);
    expect(saved(conn.id)?.status).toBe("disconnected");
  });

  it("shows the SDK's reconnect attempts and reports when they run out", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "http",
      name: "Radio",
      url: "http://192.168.1.10",
    });
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");

    act(() => client.setState(state("reconnecting", { attempt: 3 })));
    expect(saved(conn.id)).toMatchObject({
      status: "connecting",
      reconnect: { attempt: 3, maxAttempts: 10 },
    });

    act(() => client.setState(state("connected")));
    expect(saved(conn.id)).toMatchObject({
      status: "configured",
      reconnect: undefined,
    });

    act(() => client.setState(state("reconnecting", { attempt: 1 })));
    act(() => client.setState(state("disconnected")));
    expect(saved(conn.id)).toMatchObject({
      status: "error",
      errorKind: "network",
      reconnect: undefined,
    });
  });

  it("marks a denied Local Network Access permission as a terminal error", async () => {
    kmp.connectError = named("lna-denied");
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "http",
      name: "Radio",
      url: "http://192.168.1.10",
    });
    const ok = await act(() => result.current.connect(conn.id));
    expect(ok).toBe(false);
    expect(saved(conn.id)).toMatchObject({
      status: "error",
      errorKind: "lna-denied",
    });
  });
});
