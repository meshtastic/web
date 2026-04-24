import { describe, expect, it } from "vitest";
import { SignalMap, createStore, toReadonly } from "./createStore.ts";

describe("createStore", () => {
  it("exposes initial value through the readable facade", () => {
    const store = createStore(7);
    expect(store.read.value).toBe(7);
  });

  it("propagates writes to subscribers", () => {
    const store = createStore("a");
    const seen: string[] = [];
    const unsubscribe = store.read.subscribe((v) => seen.push(v));
    store.write.value = "b";
    store.write.value = "c";
    unsubscribe();
    store.write.value = "d";
    expect(seen).toEqual(["b", "c"]);
  });

  it("peek does not register a reactive read", () => {
    const store = createStore(1);
    expect(store.read.peek()).toBe(1);
    store.write.value = 2;
    expect(store.read.peek()).toBe(2);
  });
});

describe("SignalMap", () => {
  it("emits a new snapshot on each mutation", () => {
    const map = new SignalMap<number, string>();
    const seen: ReadonlyArray<string>[] = [];
    map.read.subscribe((v) => seen.push(v));

    map.set(1, "one");
    map.set(2, "two");
    map.delete(1);

    expect(seen.length).toBe(3);
    expect(seen[2]).toEqual(["two"]);
    expect(map.size).toBe(1);
    expect(map.get(2)).toBe("two");
  });

  it("clear is a no-op when already empty", () => {
    const map = new SignalMap<string, number>();
    let calls = 0;
    map.read.subscribe(() => calls++);
    map.clear();
    expect(calls).toBe(0);
  });
});

describe("toReadonly", () => {
  it("wraps a preact signal without exposing mutation", () => {
    const store = createStore(0);
    const readonly = toReadonly(store.write);
    expect(readonly.value).toBe(0);
    store.write.value = 99;
    expect(readonly.value).toBe(99);
  });
});
