import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  sql: vi.fn(),
  batch: vi.fn(),
  destroy: vi.fn(),
  getDatabaseInfo: vi.fn(),
}));

vi.mock("sqlocal/drizzle", () => ({
  SQLocalDrizzle: class {
    driver = vi.fn();
    batchDriver = vi.fn();
    sql = client.sql;
    batch = client.batch;
    destroy = client.destroy;
    getDatabaseInfo = client.getDatabaseInfo;
  },
}));

import { openSqlocalDb } from "./db.ts";

describe("openSqlocalDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.sql.mockResolvedValue([]);
    client.batch.mockResolvedValue(undefined);
    client.destroy.mockResolvedValue(undefined);
    client.getDatabaseInfo.mockResolvedValue({ storageType: "opfs" });
  });

  it("opens the database and keeps the client", async () => {
    const opened = await openSqlocalDb();
    expect(opened.persistent).toBe(true);
    expect(client.destroy).not.toHaveBeenCalled();
  });

  it("stops the client when the schema can't be applied", async () => {
    const locked = new Error("database is locked");
    client.sql.mockRejectedValueOnce(locked);
    await expect(openSqlocalDb()).rejects.toBe(locked);
    expect(client.destroy).toHaveBeenCalledTimes(1);
  });

  it("stops the client when its storage can't be read", async () => {
    const failed = new Error("no info");
    client.getDatabaseInfo.mockRejectedValueOnce(failed);
    await expect(openSqlocalDb()).rejects.toBe(failed);
    expect(client.destroy).toHaveBeenCalledTimes(1);
  });

  it("keeps the original error when stopping the client fails too", async () => {
    const locked = new Error("database is locked");
    client.sql.mockRejectedValueOnce(locked);
    client.destroy.mockRejectedValueOnce(new Error("already gone"));
    await expect(openSqlocalDb()).rejects.toBe(locked);
  });
});
