import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshStore() {
  vi.resetModules();

  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});

  const mod = await import("./index.ts");
  return mod;
}

describe("headerStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct initial state", async () => {
    const { useHeaderStore } = await freshStore();
    const state = useHeaderStore.getState();

    expect(state.title).toBe("");
    expect(Array.isArray(state.actions)).toBe(true);
    expect(state.actions).toHaveLength(0);
    expect(typeof state.setTitle).toBe("function");
    expect(typeof state.setActions).toBe("function");
    expect(typeof state.reset).toBe("function");
  });

  it("setTitle should update title", async () => {
    const { useHeaderStore } = await freshStore();
    const store = useHeaderStore.getState();

    store.setTitle("Messages");
    expect(useHeaderStore.getState().title).toBe("Messages");

    store.setTitle("Nodes");
    expect(useHeaderStore.getState().title).toBe("Nodes");
  });

  it("setActions should replace actions array (by reference) and values", async () => {
    const { useHeaderStore } = await freshStore();
    const store = useHeaderStore.getState();

    const a1 = [
      {
        key: "refresh",
        label: "Refresh",
        onClick: () => {},
      },
    ];
    store.setActions(a1);
    const afterA1 = useHeaderStore.getState().actions;

    // Values and reference both as expected
    expect(afterA1).toEqual(a1);
    expect(afterA1).toBe(a1);

    // Replace with a different array
    const a2 = [
      {
        key: "encrypt",
        label: "Encrypt",
        onClick: () => {},
        iconClasses: "text-green-600",
      },
      {
        key: "settings",
        label: "Settings",
        onClick: () => {},
      },
    ];
    store.setActions(a2);
    const afterA2 = useHeaderStore.getState().actions;

    expect(afterA2).toEqual(a2);
    expect(afterA2).toBe(a2);
    expect(afterA2).not.toBe(afterA1);
    expect(afterA2).toHaveLength(2);
  });

  it("reset should clear title and actions", async () => {
    const { useHeaderStore } = await freshStore();
    const store = useHeaderStore.getState();

    store.setTitle("Radio Config");
    store.setActions([
      { key: "save", label: "Save", onClick: () => {} },
      { key: "cancel", label: "Cancel", onClick: () => {} },
    ]);

    expect(useHeaderStore.getState().title).toBe("Radio Config");
    expect(useHeaderStore.getState().actions).toHaveLength(2);

    store.reset();

    const after = useHeaderStore.getState();
    expect(after.title).toBe("");
    expect(after.actions).toEqual([]);
  });

  it("can be updated multiple times without leaking state between calls", async () => {
    const { useHeaderStore } = await freshStore();
    const s1 = useHeaderStore.getState();

    s1.setTitle("A");
    s1.setActions([{ key: "a", label: "A", onClick: () => {} }]);
    expect(useHeaderStore.getState().title).toBe("A");
    expect(useHeaderStore.getState().actions).toHaveLength(1);

    s1.setTitle("B");
    s1.setActions([
      { key: "b1", label: "B1", onClick: () => {} },
      { key: "b2", label: "B2", onClick: () => {} },
    ]);
    expect(useHeaderStore.getState().title).toBe("B");
    expect(useHeaderStore.getState().actions).toHaveLength(2);

    s1.reset();
    expect(useHeaderStore.getState().title).toBe("");
    expect(useHeaderStore.getState().actions).toHaveLength(0);
  });

  it("actions array objects are not auto-mutated by the store", async () => {
    const { useHeaderStore } = await freshStore();
    const store = useHeaderStore.getState();

    const external = [{ key: "x", label: "X", onClick: () => {} }];
    store.setActions(external);

    // Mutate the original array after setting to store
    external.push({ key: "y", label: "Y", onClick: () => {} });

    // The store should still hold the original reference we passed,
    // so length will reflect the push IF you pass the same reference.
    // This test documents behavior; if you want immutability, clone in setActions.
    const inStore = useHeaderStore.getState().actions;
    expect(inStore).toBe(external);
    expect(inStore).toHaveLength(2);
  });
});
