import type { SdkStorage } from "@meshtastic/sdk-kmp";
import { createMemoryDb } from "@core/storage/memoryDb.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openRepositories } from "./repositories.ts";

const storage = vi.hoisted(
  (): { open?: () => Promise<{ db: unknown; persistent: boolean }> } => ({}),
);

const sdk = vi.hoisted(
  (): {
    storage?: SdkStorage;
    reject?: Error;
    hang?: boolean;
    reset: ReturnType<typeof vi.fn>;
  } => ({ reset: vi.fn() }),
);

vi.mock("@core/kmp/browserStorage.ts", () => ({
  getSdkStorage: async () => {
    if (sdk.hang) return new Promise<SdkStorage>(() => {});
    if (sdk.reject) throw sdk.reject;
    if (!sdk.storage) throw new Error("unscripted");
    return sdk.storage;
  },
  resetSdkStorage: sdk.reset,
}));

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: () => {
    if (!storage.open) throw new Error("unscripted");
    return storage.open();
  },
  coordinator: undefined,
}));

const sentinel: SdkStorage = Object.freeze({});

describe("openRepositories", () => {
  beforeEach(() => {
    sdk.storage = sentinel;
    sdk.reject = undefined;
    sdk.hang = false;
    sdk.reset.mockClear();
  });

  it("runs the SDK in memory, and forgets the stuck storage, when it hangs", async () => {
    vi.useFakeTimers();
    const db = await createMemoryDb();
    storage.open = async () => ({ db, persistent: true });
    sdk.hang = true;

    const pending = openRepositories(42);
    await vi.advanceTimersByTimeAsync(5_000);
    const opened = await pending;

    expect(opened.sdkStorage).toBeUndefined();
    expect(opened.persistent).toBe(true);
    // The next connect starts afresh rather than awaiting the same promise.
    expect(sdk.reset).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hands the SDK its own storage next to the repositories", async () => {
    const db = await createMemoryDb();
    storage.open = async () => ({ db, persistent: true });

    const opened = await openRepositories(42);

    expect(opened.persistent).toBe(true);
    expect(opened.sdkStorage).toBe(sentinel);
    expect(opened.options.messages).toBeDefined();
  });

  it("hands the SDK its own storage even when sqlocal is unavailable", async () => {
    storage.open = async () => {
      throw new Error("OPFS unavailable");
    };

    const opened = await openRepositories(42);

    expect(opened.persistent).toBe(false);
    expect(opened.options).toEqual({});
    expect(opened.sdkStorage).toBe(sentinel);
  });

  it("leaves the SDK in memory when its own storage cannot be created", async () => {
    const db = await createMemoryDb();
    storage.open = async () => ({ db, persistent: true });
    sdk.reject = new Error("no worker");

    const opened = await openRepositories(42);

    expect(opened.persistent).toBe(true);
    expect(opened.sdkStorage).toBeUndefined();
  });

  it("hands the SDK its storage when sqlocal hangs past the timeout", async () => {
    vi.useFakeTimers();
    storage.open = () => new Promise(() => {});

    const pending = openRepositories(42);
    await vi.advanceTimersByTimeAsync(5_000);
    const opened = await pending;

    expect(opened.persistent).toBe(false);
    expect(opened.sdkStorage).toBe(sentinel);
  });
});
