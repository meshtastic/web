import * as idb from "idb-keyval";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStorage } from "./indexDB.ts";

type PersistStorage<T> = ReturnType<typeof createStorage<T>>;

describe("indexDB.ts persistence (steps 1–5)", () => {
  let store: PersistStorage<any>;

  beforeEach(() => {
    vi.restoreAllMocks();
    store = createStorage<any>();
  });

  async function roundTrip(obj: any) {
    const setSpy = vi.spyOn(idb, "set").mockResolvedValue();
    const getSpy = vi.spyOn(idb, "get");
    await store.setItem("rt", obj);
    const storedStr = (setSpy.mock.calls[0] as any[])[1] as string;
    getSpy.mockResolvedValue(storedStr);
    return await store.getItem("rt");
  }

  // Basic methods
  it("getItem returns null when idb-keyval.get yields undefined", async () => {
    const getSpy = vi.spyOn(idb, "get").mockResolvedValue(undefined);
    const res = await store.getItem("missing-key");
    expect(getSpy).toHaveBeenCalledWith("missing-key");
    expect(res).toBeNull();
  });

  it("setItem writes a string via idb-keyval.set", async () => {
    const setSpy = vi.spyOn(idb, "set").mockResolvedValue();
    const payload = { state: { a: 1 }, version: 0 };
    await store.setItem("k1", payload);
    expect(setSpy).toHaveBeenCalledTimes(1);
    const [, value] = setSpy.mock.calls[0]!;
    expect(typeof value).toBe("string");
    // sanity: it should be JSON
    expect(() => JSON.parse(value as string)).not.toThrow();
  });

  it("removeItem calls idb-keyval.del and getItem returns null afterwards", async () => {
    const delSpy = vi.spyOn(idb, "del").mockResolvedValue();
    await store.removeItem("k2");
    expect(delSpy).toHaveBeenCalledWith("k2");

    const getSpy = vi.spyOn(idb, "get").mockResolvedValue(undefined);
    const res = await store.getItem("k2");
    expect(getSpy).toHaveBeenCalledWith("k2");
    expect(res).toBeNull();
  });

  // Map
  it("round-trips an empty Map", async () => {
    const out = await roundTrip({ state: { m: new Map() }, version: 0 });
    expect(out?.state.m instanceof Map).toBe(true);
    expect(out?.state.m.size).toBe(0);
  });

  it("round-trips a Map<number,string> and preserves numeric key semantics", async () => {
    const m = new Map<number, string>([[1, "a"]]);
    const out = await roundTrip({ state: { m }, version: 0 });
    const m2 = out!.state.m as Map<number, string>;
    expect(m2 instanceof Map).toBe(true);
    expect(m2.get(1)).toBe("a");
  });

  it("round-trips nested Map inside arrays/objects", async () => {
    const payload = {
      state: {
        list: [new Map<number, number>([[2, 3]])],
        obj: { inner: new Map<string, number>([["k", 7]]) },
      },
      version: 0,
    };
    const out = await roundTrip(payload);

    expect(out!.state.list[0] instanceof Map).toBe(true);
    expect((out!.state.list[0] as Map<number, number>).get(2)).toBe(3);
    expect(out!.state.obj.inner instanceof Map).toBe(true);
    expect((out!.state.obj.inner as Map<string, number>).get("k")).toBe(7);
  });

  // Uint8Array
  it("round-trips a Uint8Array (simple)", async () => {
    const u8 = new Uint8Array([1, 2, 255]);
    const out = await roundTrip({ state: { u8 }, version: 0 });
    const u2 = out!.state.u8 as Uint8Array;
    expect(u2 instanceof Uint8Array).toBe(true);
    expect(Array.from(u2)).toEqual([1, 2, 255]);
  });

  it("round-trips a Uint8Array view with non-zero byteOffset", async () => {
    const buf = new Uint8Array([0, 9, 8, 7, 6, 5, 4, 3]).buffer;
    const view = new Uint8Array(buf, 2, 4); // [8,7,6,5]
    const out = await roundTrip({ state: { view }, version: 0 });
    const v2 = out!.state.view as Uint8Array;
    expect(v2 instanceof Uint8Array).toBe(true);
    expect(Array.from(v2)).toEqual([8, 7, 6, 5]);
    // ensure it's a standalone buffer now, without offset
    expect(v2.byteOffset).toBe(0);
  });

  // Mixed & nested structures
  it("round-trips Map values containing objects with nested Uint8Array", async () => {
    const inner = { key: new Uint8Array([7, 8]) };
    const m = new Map<number, { key: Uint8Array }>([[42, inner]]);
    const out = await roundTrip({ state: { m }, version: 0 });
    const m2 = out!.state.m as Map<number, { key: Uint8Array }>;
    expect(m2 instanceof Map).toBe(true);

    const got = m2.get(42)!;
    expect(got.key instanceof Uint8Array).toBe(true);
    expect(Array.from(got.key)).toEqual([7, 8]);
  });

  it("round-trips deep nesting (array → object → map → u8)", async () => {
    const payload = {
      state: {
        arr: [
          {
            obj: {
              m: new Map<string, Uint8Array>([["k", new Uint8Array([9])]]),
            },
          },
        ],
      },
      version: 0,
    };
    const out = await roundTrip(payload);
    const m2 = out!.state.arr[0].obj.m as Map<string, Uint8Array>;
    expect(m2 instanceof Map).toBe(true);
    const u = m2.get("k")!;
    expect(u instanceof Uint8Array).toBe(true);
    expect(Array.from(u)).toEqual([9]);
  });

  it("does not alter plain objects/arrays", async () => {
    const payload = { state: { a: 1, b: [2, 3], c: { d: 4 } }, version: 0 };
    const out = await roundTrip(payload);
    expect(out).toEqual(payload);
  });

  it("revives envelope-looking objects", async () => {
    // Current implementation will treat any {__datatype:"Map",value:[...]} as an envelope.
    const forged = JSON.stringify({
      state: { m: { __datatype: "Map", value: [[1, "x"]] } },
      version: 0,
    });
    const getSpy = vi.spyOn(idb, "get").mockResolvedValue(forged);
    const out = await store.getItem("forged");
    expect(getSpy).toHaveBeenCalled();
    const m2 = out!.state.m as Map<number, string>;
    expect(m2 instanceof Map).toBe(true);
    expect(m2.get(1)).toBe("x");
  });
});
