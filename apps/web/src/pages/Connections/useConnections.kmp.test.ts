import { create, toBinary } from "@bufbuild/protobuf";
import { FakeKmpClient, state } from "@core/kmp/fakeClient.ts";
import type { Connection } from "@app/core/stores/deviceStore/types";
import { meshRegistry } from "@core/kmp/registry.ts";
import { useDeviceStore } from "@core/stores";
import { Protobuf } from "@core/protobuf.ts";
import type { StorageJs } from "@meshtastic/sdk-kmp";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { disconnectAllConnections, useConnections } from "./useConnections.ts";

const kmp = vi.hoisted(
  (): {
    client?: FakeKmpClient;
    clients: FakeKmpClient[];
    storages: Array<StorageJs | undefined>;
    connectError?: Error;
  } => ({ clients: [], storages: [] }),
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
    createHttpClient: async (
      _url: string,
      _allowPrompt: boolean,
      storage?: StorageJs,
    ) => {
      kmp.storages.push(storage);
      const client = new FakeKmpClient();
      if (kmp.connectError) {
        const error = kmp.connectError;
        client.connect = async () => {
          throw error;
        };
      }
      kmp.client = client;
      kmp.clients.push(client);
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
    kmp.clients = [];
    kmp.storages = [];
    kmp.connectError = undefined;
    useDeviceStore.setState({ savedConnections: [] });
  });

  const addRadio = (
    result: { current: ReturnType<typeof useConnections> },
    name = "Radio",
  ) =>
    result.current.addConnection({
      type: "http",
      name,
      url: `http://192.168.1.${name.length}`,
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

  it("disconnects every live session through the drawer's teardown", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");

    await act(() => disconnectAllConnections());
    expect(client.disconnects).toHaveLength(1);
    expect(saved(conn.id)?.status).toBe("disconnected");
    expect(meshRegistry.get(conn.id)?.kmp).toBe(client);
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

    act(() => client.setState(state("reconnecting", { attempt: 3 })));
    act(() => client.setState(state("disconnected")));
    expect(saved(conn.id)).toMatchObject({
      status: "error",
      errorKind: "network",
      reconnect: undefined,
    });
  });

  it("reports the cause when the SDK drops without retrying", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");

    act(() =>
      client.setState(
        state("reconnecting", {
          attempt: 1,
          error: "Firmware 2.3.0 is older than the minimum 2.6.0",
          errorKind: "firmware-too-old",
        }),
      ),
    );
    act(() => client.setState(state("disconnected")));

    expect(saved(conn.id)).toMatchObject({
      status: "error",
      error: "Firmware 2.3.0 is older than the minimum 2.6.0",
      reconnect: undefined,
    });
  });

  it("reports a drop the SDK gave up on without any reconnect attempt", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");
    expect(saved(conn.id)?.status).toBe("configured");

    act(() => client.setState(state("disconnected")));

    expect(saved(conn.id)).toMatchObject({
      status: "error",
      error: "The connection to the radio was lost.",
      errorKind: "network",
      reconnect: undefined,
    });
  });

  it("keeps the connection while the session runs its own handshake again", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");
    const statuses: string[] = [];
    const off = useDeviceStore.subscribe(() => {
      const status = saved(conn.id)?.status;
      if (status && statuses.at(-1) !== status) statuses.push(status);
    });

    await act(() => meshRegistry.get(conn.id)?.rehandshake());

    off();
    expect(statuses).not.toContain("error");
    expect(saved(conn.id)?.status).toBe("configured");
    expect(client.disconnects).toHaveLength(1);
    expect(client.connects).toHaveLength(2);
  });

  it("disconnects the old client before connecting the same connection again", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    const first = kmp.clients[0];
    if (!first) throw new Error("no client created");

    act(() => result.current.syncConnectionStatuses());
    act(() =>
      useDeviceStore
        .getState()
        .updateSavedConnection(conn.id, { status: "disconnected" }),
    );
    await act(() => result.current.connect(conn.id));

    expect(kmp.clients).toHaveLength(2);
    expect(first.disconnects).toHaveLength(1);
    expect(meshRegistry.get(conn.id)?.kmp).toBe(kmp.clients[1]);
  });

  it("tears down the session on another connection before connecting", async () => {
    const { result } = renderHook(() => useConnections());
    const a = addRadio(result, "A");
    const b = addRadio(result, "Bee");
    await act(() => result.current.connect(a.id));
    const clientA = kmp.clients[0];
    if (!clientA) throw new Error("no client created");

    await act(() => result.current.connect(b.id));

    expect(clientA.disconnects).toHaveLength(1);
    expect(saved(a.id)?.status).toBe("disconnected");
    expect(saved(b.id)?.status).toBe("configured");
  });

  it("stops reconnecting when the local network permission is revoked", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");

    await act(async () => {
      client.setState(
        state("reconnecting", {
          attempt: 1,
          error: "Local network access denied",
          errorKind: "lna-denied",
        }),
      );
    });

    expect(saved(conn.id)).toMatchObject({
      status: "error",
      errorKind: "lna-denied",
      reconnect: undefined,
    });
    expect(client.disconnects).toHaveLength(1);

    await act(async () => {
      client.setState(state("reconnecting", { attempt: 2 }));
      client.setState(state("disconnected"));
    });
    expect(saved(conn.id)?.status).toBe("error");
    expect(saved(conn.id)?.errorKind).toBe("lna-denied");
  });

  it("stays disconnected when the local network prompt was dismissed mid-session", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");

    await act(async () => {
      client.setState(
        state("reconnecting", { attempt: 1, errorKind: "lna-prompt" }),
      );
    });

    expect(saved(conn.id)).toMatchObject({
      status: "disconnected",
      reconnect: undefined,
    });
    expect(client.disconnects).toHaveLength(1);
  });

  it("runs the SDK in memory when the web's storage could not be opened", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));

    expect(kmp.storages).toEqual([undefined]);
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
