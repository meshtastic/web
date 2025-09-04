import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { runTransportContract } from "../../../tests/utils/transportContract.ts";
import { TransportHTTP } from "./transport.ts";

let abortTimeoutSpy: MockInstance | undefined;
beforeEach(() => {
  abortTimeoutSpy = vi
    .spyOn(
      globalThis.AbortSignal as unknown as { timeout(ms: number): AbortSignal },
      "timeout",
    )
    .mockImplementation((ms: number) => {
      const ctrl = new AbortController();
      const abort = () =>
        ctrl.abort(new DOMException("Timeout reached", "TimeoutError"));
      // Uses setTimeout so vi.useFakeTimers() can fast-forward it
      setTimeout(abort, ms);
      return ctrl.signal;
    });
});

afterEach(() => {
  abortTimeoutSpy?.mockRestore();
});

function stubFetch() {
  const inbox: Uint8Array[] = [];
  let lastWritten: ArrayBuffer | undefined;

  let forceNextReadToHang = false;
  let forceNextReadToReturn500 = false;

  function makeAbortAwareHang(signal?: AbortSignal): Promise<Response> {
    return new Promise((_, reject) => {
      const abort = () => reject(new DOMException("Aborted", "AbortError"));
      if (signal?.aborted) {
        abort();
        return;
      }
      if (signal) {
        signal.addEventListener("abort", abort, { once: true });
      }
    });
  }

  const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();

    if (url.includes("/api/v1/toradio") && method === "OPTIONS") {
      return { ok: true, status: 204 } as Response;
    }

    if (url.includes("/api/v1/toradio") && method === "PUT") {
      lastWritten = init?.body as ArrayBuffer;
      return { ok: true, status: 200 } as Response;
    }

    if (url.includes("/api/v1/fromradio") && method === "GET") {
      if (forceNextReadToHang) {
        forceNextReadToHang = false;
        return makeAbortAwareHang(init?.signal ?? undefined);
      }

      if (forceNextReadToReturn500) {
        forceNextReadToReturn500 = false;
        return {
          ok: false,
          status: 500,
          arrayBuffer: async () => new ArrayBuffer(0),
        } as Response;
      }

      const next = inbox.shift() ?? new Uint8Array();
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => next.buffer,
      } as Response;
    }

    return { ok: true, status: 200 } as Response;
  });

  vi.stubGlobal("fetch", mockFetch);

  return {
    pushIncoming: (u8: Uint8Array) => inbox.push(u8),
    assertLastWritten: (u8: Uint8Array) => {
      const got = new Uint8Array(lastWritten || new ArrayBuffer(0));
      expect(got).toEqual(u8);
    },
    forceReadErrorOnce: () => {
      forceNextReadToReturn500 = true;
    },
    forceReadTimeoutOnce: () => {
      forceNextReadToHang = true;
    },
    getMock: () => mockFetch,
    cleanup: () => vi.unstubAllGlobals(),
  };
}

async function tickNextTimer() {
  try {
    await vi.advanceTimersToNextTimerAsync();
  } catch {
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe("TransportHTTP (contract)", () => {
  runTransportContract({
    name: "TransportHTTP",
    setup: () => {
      vi.useFakeTimers();
    },
    teardown: () => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    },
    create: async () => {
      (
        globalThis as unknown as { __http: ReturnType<typeof stubFetch> }
      ).__http = stubFetch();
      const transport = await TransportHTTP.create("127.0.0.1:80", false);
      await tickNextTimer();
      return transport;
    },
    pushIncoming: async (bytes) => {
      (
        globalThis as unknown as { __http: ReturnType<typeof stubFetch> }
      ).__http.pushIncoming(bytes);
      await tickNextTimer();
    },
    assertLastWritten: (bytes) => {
      (
        globalThis as unknown as { __http: ReturnType<typeof stubFetch> }
      ).__http.assertLastWritten(bytes);
    },
    triggerDisconnect: async () => {
      (
        globalThis as unknown as { __http: ReturnType<typeof stubFetch> }
      ).__http.forceReadErrorOnce();
      await tickNextTimer();
    },
  });
});

describe("TransportHTTP (extras)", () => {
  let httpStub: ReturnType<typeof stubFetch> | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    httpStub?.cleanup();
    httpStub = undefined;
  });

  async function createTransport(): Promise<TransportHTTP> {
    httpStub = stubFetch();
    const transport = await TransportHTTP.create("127.0.0.1:80", false);
    await tickNextTimer();
    return transport;
  }

  async function advanceOnePoll() {
    await tickNextTimer();
  }

  it("emits DeviceDisconnected with reason 'read-timeout' when GET /fromradio hangs", async () => {
    const transport = await createTransport();
    const reader = transport.fromDevice.getReader();

    httpStub!.forceReadTimeoutOnce();

    await tickNextTimer();
    await vi.advanceTimersByTimeAsync(8000);

    let sawReadTimeout = false;
    for (let i = 0; i < 6; i++) {
      const { value } = await reader.read();
      if (value?.type === "status" && value.data.reason === "read-timeout") {
        sawReadTimeout = true;
        break;
      }
    }
    expect(sawReadTimeout).toBe(true);

    reader.releaseLock();
    await transport.disconnect();
  });

  it("stops polling after disconnect()", async () => {
    const transport = await createTransport();

    const fetchMock = httpStub!.getMock();
    const callsBeforeDisconnect = fetchMock.mock.calls.length;

    await transport.disconnect();

    await advanceOnePoll();
    await vi.runOnlyPendingTimersAsync();

    const callsAfterDisconnect = fetchMock.mock.calls.length;
    expect(callsAfterDisconnect).toBe(callsBeforeDisconnect);
  });

  it("emits DeviceDisconnected with reason 'read-timeout' when GET /fromradio hangs", async () => {
    const transport = await createTransport();
    const reader = transport.fromDevice.getReader();

    httpStub!.forceReadTimeoutOnce();

    await vi.advanceTimersToNextTimerAsync();

    await vi.advanceTimersByTimeAsync(8000);

    await Promise.resolve();
    await Promise.resolve();

    let sawReadTimeout = false;
    for (let i = 0; i < 6; i++) {
      const { value } = await reader.read();
      if (value?.type === "status" && value.data.reason === "read-timeout") {
        sawReadTimeout = true;
        break;
      }
    }
    expect(sawReadTimeout).toBe(true);

    reader.releaseLock();
    await transport.disconnect();
  });
});
