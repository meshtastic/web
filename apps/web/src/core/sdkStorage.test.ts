import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlocal = vi.hoisted(() => ({
  open: vi.fn(),
  close: vi.fn(async () => {}),
}));

vi.mock("@core/storage/db.ts", () => ({
  openSqlocalDb: sqlocal.open,
}));

describe("sdkStorage singletons", () => {
  beforeEach(() => {
    vi.resetModules();
    sqlocal.open.mockReset();
    sqlocal.close.mockClear();
    sqlocal.open.mockImplementation(async () => ({
      db: {},
      storageType: "opfs",
      persistent: true,
      close: sqlocal.close,
    }));
  });

  it("closes the database on request and reopens a fresh one afterwards", async () => {
    const { getStorageDb, closeStorageDb, resumeStorageDb } =
      await import("./sdkStorage.ts");
    const first = await getStorageDb();

    await closeStorageDb();
    resumeStorageDb();
    const second = await getStorageDb();

    expect(sqlocal.close).toHaveBeenCalledTimes(1);
    expect(sqlocal.open).toHaveBeenCalledTimes(2);
    expect(second).not.toBe(first);
  });

  it("closing while nothing is open is a no-op", async () => {
    const { closeStorageDb } = await import("./sdkStorage.ts");
    await closeStorageDb();
    expect(sqlocal.close).not.toHaveBeenCalled();
  });

  it("swallows a close that fails, so the lock is still released", async () => {
    sqlocal.close.mockRejectedValueOnce(new Error("worker gone"));
    const { getStorageDb, closeStorageDb } = await import("./sdkStorage.ts");
    await getStorageDb();
    await expect(closeStorageDb()).resolves.toBeUndefined();
  });

  it("refuses to reopen after a close until the tab owns the app again", async () => {
    const { getStorageDb, closeStorageDb, resumeStorageDb } =
      await import("./sdkStorage.ts");
    await getStorageDb();
    await closeStorageDb();

    await expect(getStorageDb()).rejects.toThrow(/another tab/);
    expect(sqlocal.open).toHaveBeenCalledTimes(1);

    resumeStorageDb();
    await getStorageDb();
    expect(sqlocal.open).toHaveBeenCalledTimes(2);
  });
});

describe("removeLegacyDatabase", () => {
  it("removes the old files it can and never throws", async () => {
    const { removeLegacyDatabase } = await import("./sdkStorage.ts");
    const removeEntry = vi.fn(async (name: string) => {
      if (name !== "meshtastic.db") throw new Error("NotFoundError");
    });
    expect(await removeLegacyDatabase(async () => ({ removeEntry }))).toEqual([
      "meshtastic.db",
    ]);
    expect(removeEntry).toHaveBeenCalledTimes(3);
  });

  it("leaves a file another tab holds and survives a missing OPFS", async () => {
    const { removeLegacyDatabase } = await import("./sdkStorage.ts");
    const locked = vi.fn(async () => {
      throw new Error("NoModificationAllowedError");
    });
    expect(
      await removeLegacyDatabase(async () => ({ removeEntry: locked })),
    ).toEqual([]);
    expect(await removeLegacyDatabase(async () => undefined)).toEqual([]);
    expect(
      await removeLegacyDatabase(async () => {
        throw new Error("SecurityError");
      }),
    ).toEqual([]);
  });
});
