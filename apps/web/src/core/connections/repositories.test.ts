import { createMemoryDb } from "@core/storage/memoryDb.ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openRepositories } from "./repositories.ts";

const storage = vi.hoisted(
  (): { open?: () => Promise<{ db: unknown; persistent: boolean }> } => ({}),
);

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: () => {
    if (!storage.open) throw new Error("unscripted");
    return storage.open();
  },
  coordinator: undefined,
}));

describe("openRepositories", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hands the SDK the same database the repositories use", async () => {
    const db = await createMemoryDb();
    storage.open = async () => ({ db, persistent: true });

    const opened = await openRepositories(42);

    expect(opened.persistent).toBe(true);
    expect(opened.sdkStorage).toBeDefined();
    expect(opened.options.messages).toBeDefined();
    const activated = await opened.sdkStorage?.activate("http:radio");
    expect(activated).toBeDefined();
  });

  it("leaves the SDK in memory when the open fails", async () => {
    storage.open = async () => {
      throw new Error("OPFS unavailable");
    };

    const opened = await openRepositories(42);

    expect(opened).toEqual({
      persistent: false,
      sdkStorage: undefined,
      options: {},
    });
  });

  it("leaves the SDK in memory when the open hangs past the timeout", async () => {
    vi.useFakeTimers();
    storage.open = () => new Promise(() => {});

    const pending = openRepositories(42);
    await vi.advanceTimersByTimeAsync(5_000);
    const opened = await pending;

    expect(opened.persistent).toBe(false);
    expect(opened.sdkStorage).toBeUndefined();
  });
});
