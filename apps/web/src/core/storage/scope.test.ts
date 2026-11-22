import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  checkScopeMove,
  isProvisionalScope,
  provisionalScopeId,
  StorageScope,
} from "./scope.ts";

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("provisionalScopeId", () => {
  it("hands out distinct negative ids", () => {
    const ids = Array.from({ length: 100 }, () => provisionalScopeId());
    expect(ids.every(isProvisionalScope)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("checkScopeMove", () => {
  it("allows only a provisional scope into a radio's", () => {
    expect(Result.isOk(checkScopeMove(-3, 0x0a0b0c0d))).toBe(true);
    expect(Result.isError(checkScopeMove(0x01020304, 0x0a0b0c0d))).toBe(true);
    expect(Result.isError(checkScopeMove(-3, -4))).toBe(true);
    expect(Result.isError(checkScopeMove(-3, 0))).toBe(true);
  });
});

describe("StorageScope", () => {
  it("runs each call with the id current when it starts", async () => {
    const scope = new StorageScope(-1);
    expect(scope.provisional).toBe(true);
    expect(await scope.run(async (id) => id)).toBe(-1);
    scope.set(7);
    expect(scope.provisional).toBe(false);
    expect(await scope.run(async (id) => id)).toBe(7);
  });

  it("moves after the calls already started, and holds later ones until it is done", async () => {
    const scope = new StorageScope(-1);
    const order: string[] = [];
    const slowWrite = deferred();
    const write = scope.run(async (id) => {
      await slowWrite.promise;
      order.push(`write ${id}`);
    });
    await Promise.resolve(); // the write has started
    const move = deferred();
    const moved = scope.moveTo(7, async (from, to) => {
      order.push(`move ${from}->${to}`);
      await move.promise;
      return Result.ok(undefined);
    });
    const read = scope.run(async (id) => {
      order.push(`read ${id}`);
    });

    expect(scope.deviceId).toBe(7);
    slowWrite.resolve();
    await write;
    move.resolve();
    await moved;
    await read;
    expect(order).toEqual(["write -1", "move -1->7", "read 7"]);
  });

  it("lets later calls run when a move fails", async () => {
    const scope = new StorageScope(-1);
    const moved = await scope.moveTo(7, async () =>
      Result.err(new Error("disk full")),
    );
    expect(Result.isError(moved)).toBe(true);
    expect(await scope.run(async (id) => id)).toBe(7);
  });

  it("runs an exclusive call after the ones started, before later ones", async () => {
    const scope = new StorageScope(-1);
    const order: string[] = [];
    const first = scope.run(async () => {
      order.push("first");
    });
    const exclusive = scope.exclusive(async (id) => {
      order.push(`exclusive ${id}`);
    });
    const later = scope.run(async () => {
      order.push("later");
    });
    await Promise.all([first, exclusive, later]);
    expect(order).toEqual(["first", "exclusive -1", "later"]);
  });
});
