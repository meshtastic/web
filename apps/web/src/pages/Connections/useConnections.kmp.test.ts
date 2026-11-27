import { create, toBinary } from "@bufbuild/protobuf";
import { FakeKmpClient, state } from "@core/kmp/fakeClient.ts";
import type { Connection } from "@app/core/stores/deviceStore/types";
import { meshRegistry } from "@core/kmp/registry.ts";
import { useDeviceStore } from "@core/stores";
import { Protobuf } from "@core/protobuf.ts";
import type { SdkStorage } from "@meshtastic/sdk-kmp";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  disconnectAllConnections,
  OPEN_TIMEOUT_MS,
  useConnections,
} from "./useConnections.ts";

const calls = vi.hoisted((): string[] => []);

const storage = vi.hoisted(() => ({ close: vi.fn(async () => {}) }));

const sdkStorage = vi.hoisted(() => ({
  reset: vi.fn((): void => {}),
}));

const sdkOpened = vi.hoisted((): { storage?: SdkStorage } => ({}));

const kmp = vi.hoisted(
  (): {
    client?: FakeKmpClient;
    clients: FakeKmpClient[];
    storages: Array<SdkStorage | undefined>;
    connectError?: Error;
    connectHangs?: boolean;
    holdFactory?: Promise<void>;
  } => ({ clients: [], storages: [] }),
);

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: async () => {
    throw new Error("no storage in tests");
  },
  closeStorageDb: storage.close,
  coordinator: undefined,
}));

vi.mock("@core/kmp/browserStorage.ts", () => ({
  getSdkStorage: async () => {
    if (!sdkOpened.storage) throw new Error("no SDK storage in tests");
    return sdkOpened.storage;
  },
  resetSdkStorage: sdkStorage.reset,
}));

vi.mock("@core/kmp/client.ts", async () => {
  const { FakeKmpClient } = await import("@core/kmp/fakeClient.ts");
  return {
    createHttpClient: async (
      _url: string,
      _allowPrompt: boolean,
      storage?: SdkStorage,
    ) => {
      kmp.storages.push(storage);
      await kmp.holdFactory;
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
    createSerialClient: async (_target: unknown, storage?: SdkStorage) => {
      kmp.storages.push(storage);
      await kmp.holdFactory;
      const client = new FakeKmpClient();
      if (kmp.connectHangs) {
        client.connect = () => new Promise<void>(() => {});
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
    kmp.connectHangs = false;
    kmp.holdFactory = undefined;
    sdkOpened.storage = undefined;
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

    storage.close.mockClear();
    await act(() => disconnectAllConnections());
    expect(client.disconnects).toHaveLength(1);
    expect(saved(conn.id)?.status).toBe("disconnected");
    expect(meshRegistry.get(conn.id)?.kmp).toBe(client);
    expect(storage.close).toHaveBeenCalledTimes(1);
  });

  it("takeover forgets the SDK storage", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");
    const disconnect = client.disconnect.bind(client);
    client.disconnect = async () => {
      await disconnect();
      calls.push("disconnected");
    };
    sdkStorage.reset.mockReset();
    sdkStorage.reset.mockImplementation(() => {
      calls.push("reset");
    });
    calls.length = 0;

    await act(() => disconnectAllConnections());

    expect(sdkStorage.reset).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["disconnected", "reset"]);
  });

  it("abandons a connect that was in flight when the app is handed to another tab", async () => {
    let releaseFactory: () => void = () => {};
    kmp.holdFactory = new Promise<void>(
      (resolve) => (releaseFactory = resolve),
    );
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    const connecting = result.current.connect(conn.id);
    await act(async () => {});

    await act(() => disconnectAllConnections());
    releaseFactory();
    expect(await act(() => connecting)).toBe(false);

    const client = kmp.client;
    if (!client) throw new Error("no client created");
    expect(client.connects).toHaveLength(0);
    expect(meshRegistry.get(conn.id)).toBeUndefined();
    expect(saved(conn.id)?.status).toBe("disconnected");
    kmp.holdFactory = undefined;
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
      errorKind: "interrupted",
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

  it("runs the SDK in memory when its storage could not be created", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));

    expect(kmp.storages).toEqual([undefined]);
  });

  it("hands the client factory the SDK storage it opened", async () => {
    const opened: SdkStorage = Object.freeze({});
    sdkOpened.storage = opened;
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));

    expect(kmp.storages).toHaveLength(1);
    expect(kmp.storages[0]).toBe(opened);
  });

  it("records when the radio was last reached, not only when it disconnects", async () => {
    const now = vi.spyOn(Date, "now");
    try {
      const { result } = renderHook(() => useConnections());
      const conn = addRadio(result);
      expect(saved(conn.id)?.lastConnectedAt).toBeUndefined();

      now.mockReturnValue(1_000);
      await act(() => result.current.connect(conn.id));
      expect(saved(conn.id)).toMatchObject({
        status: "configured",
        lastConnectedAt: 1_000,
      });

      now.mockReturnValue(2_000);
      await act(() => result.current.disconnect(conn.id));
      expect(saved(conn.id)?.lastConnectedAt).toBe(2_000);
    } finally {
      now.mockRestore();
    }
  });

  it("does not record a failed connect as having reached the radio", async () => {
    kmp.connectError = named("transport");
    const { result } = renderHook(() => useConnections());
    const conn = addRadio(result);
    await act(() => result.current.connect(conn.id));
    await act(() => result.current.disconnect(conn.id));
    expect(saved(conn.id)?.lastConnectedAt).toBeUndefined();
  });

  it("marks an unfinished attempt pending until it reaches the radio", async () => {
    let releaseFactory: () => void = () => {};
    kmp.holdFactory = new Promise<void>(
      (resolve) => (releaseFactory = resolve),
    );
    const { result } = renderHook(() => useConnections());
    const connecting = result.current.addConnectionAndConnect({
      type: "http",
      name: "Radio",
      url: "http://192.168.1.10",
    });
    await act(async () => {});
    const [pending] = useDeviceStore.getState().savedConnections;
    expect(pending?.pending).toBe(true);

    releaseFactory();
    const conn = await act(() => connecting);
    expect(saved(conn.id)?.pending).toBeUndefined();
    kmp.holdFactory = undefined;
  });

  it("returns the saved connection with the status the attempt reached", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = await act(() =>
      result.current.addConnectionAndConnect({
        type: "http",
        name: "Radio",
        url: "http://192.168.1.10",
      }),
    );
    expect(conn.status).toBe("configured");
  });

  it("returns an error status when a kept attempt fails", async () => {
    kmp.connectError = named("transport");
    const { result } = renderHook(() => useConnections());
    const conn = await act(() =>
      result.current.addConnectionAndConnect(
        { type: "http", name: "Radio", url: "http://192.168.1.10" },
        undefined,
        { keep: true },
      ),
    );
    kmp.connectError = undefined;
    expect(conn.status).toBe("error");
  });

  it("drops earlier unfinished attempts at the same radio once one reaches it", async () => {
    kmp.connectError = named("transport");
    const { result } = renderHook(() => useConnections());
    const input = {
      type: "http",
      name: "Radio",
      url: "http://192.168.1.10",
    } as const;
    const failed = await act(() =>
      result.current.addConnectionAndConnect(input),
    );
    const other = await act(() =>
      result.current.addConnectionAndConnect({
        ...input,
        url: "http://192.168.1.11",
      }),
    );
    kmp.connectError = undefined;
    const ok = await act(() => result.current.addConnectionAndConnect(input));

    expect(saved(ok.id)?.status).toBe("configured");
    expect(saved(failed.id)).toBeUndefined();
    expect(saved(other.id)).toBeDefined();
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

  describe("a serial connect stuck opening the port", () => {
    const addUsb = (result: { current: ReturnType<typeof useConnections> }) =>
      result.current.addConnection({
        type: "serial",
        name: "USB radio",
        usbVendorId: 0x303a,
        usbProductId: 0x1001,
      });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("times out with a visible error when the port never opens", async () => {
      vi.useFakeTimers();
      kmp.connectHangs = true;
      const { result } = renderHook(() => useConnections());
      const conn = addUsb(result);

      const connecting = result.current.connect(conn.id);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS - 1);
      });
      expect(saved(conn.id)?.status).toBe("connecting");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(await connecting).toBe(false);
      expect(saved(conn.id)).toMatchObject({
        status: "error",
        error: expect.stringContaining("didn't open"),
      });
      expect(meshRegistry.get(conn.id)).toBeUndefined();
      expect(kmp.client?.disconnects).toHaveLength(1);

      // Retry starts a fresh attempt that can succeed.
      kmp.connectHangs = false;
      vi.useRealTimers();
      expect(await act(() => result.current.connect(conn.id))).toBe(true);
      expect(saved(conn.id)?.status).toBe("configured");
    });

    it("times out when the client is never created", async () => {
      vi.useFakeTimers();
      kmp.holdFactory = new Promise<void>(() => {});
      const { result } = renderHook(() => useConnections());
      const conn = addUsb(result);

      const connecting = result.current.connect(conn.id);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS);
      });
      expect(await connecting).toBe(false);
      expect(saved(conn.id)?.status).toBe("error");
    });

    it("does not come back after the user cancels a stuck connect", async () => {
      vi.useFakeTimers();
      kmp.connectHangs = true;
      const { result } = renderHook(() => useConnections());
      const conn = addUsb(result);

      const connecting = result.current.connect(conn.id);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
      await act(() => result.current.disconnect(conn.id));
      expect(await connecting).toBe(false);
      expect(saved(conn.id)?.status).toBe("disconnected");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS);
      });
      expect(saved(conn.id)?.status).toBe("disconnected");
    });
  });
});
