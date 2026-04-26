import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const idbMem = new Map<string, string>();
vi.mock("idb-keyval", () => ({
  get: vi.fn((key: string) => Promise.resolve(idbMem.get(key))),
  set: vi.fn((key: string, val: string) => {
    idbMem.set(key, val);
    return Promise.resolve();
  }),
  del: vi.fn((k: string) => {
    idbMem.delete(k);
    return Promise.resolve();
  }),
}));

let deviceIdForTests = 1;
vi.mock("@core/hooks/useDeviceContext", () => ({
  useDeviceContext: () => ({ deviceId: deviceIdForTests }),
  __setDeviceId: (id: number) => {
    deviceIdForTests = id;
  },
}));

async function freshStore(persist = false) {
  vi.resetModules();

  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});

  vi.doMock("@core/services/featureFlags", () => ({
    featureFlags: {
      get: vi.fn((key: string) => (key === "persistNodeDB" ? persist : false)),
    },
  }));

  const storeMod = await import("./index.ts");
  const { useNodeDB } = await import("../index.ts");
  return { ...storeMod, useNodeDB };
}

function makeNode(num: number, extras: Record<string, any> = {}) {
  return create(Protobuf.Mesh.NodeInfoSchema, { num, ...extras });
}

describe("NodeDB store", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("addNodeDB returns the registered DB on repeated calls; getNodeDB works", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();
    const a = st.addNodeDB(1);
    const b = st.addNodeDB(1);
    // immer's structural sharing may reseat the map entry after
    // pruneStaleNodes, so identity is not stable — content is.
    expect(b.id).toBe(a.id);
    expect(st.getNodeDB(1)?.id).toBe(1);
    expect(st.getNodeDB(2)).toBeUndefined();
  });

  it("addNode, getNode(s), getNodesLength, removeNode", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);
    db.addNode(makeNode(10));
    db.addNode(makeNode(11));
    expect(db.getNodesLength()).toBe(2);
    expect(db.getNode(10)?.num).toBe(10);

    db.removeNode(10);
    expect(db.getNode(10)).toBeUndefined();
    expect(db.getNodesLength()).toBe(1);
  });

  it("processPacket creates or updates a node", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);

    db.processPacket({ from: 5, snr: 7, time: 1000 });
    expect(db.getNode(5)?.snr).toBe(7);

    db.processPacket({ from: 5, snr: 9, time: 1500 });
    expect(db.getNode(5)?.snr).toBe(9);
    expect(db.getNode(5)?.lastHeard).toBe(1500);
  });

  it("addUser and addPosition updates existing or creates new nodes", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);

    db.addUser({
      from: 7,
      to: 0,
      channel: 0,
      type: "broadcast",
      rxTime: new Date(),
      id: 0,
      data: create(Protobuf.Mesh.UserSchema, { longName: "Alpha" }),
    });
    expect(db.getNode(7)?.user?.longName).toBe("Alpha");

    db.addPosition({
      from: 7,
      to: 0,
      channel: 0,
      type: "broadcast",
      rxTime: new Date(),
      id: 0,
      data: create(Protobuf.Mesh.PositionSchema, { latitudeI: 100 }),
    });
    expect(db.getNode(7)?.position?.latitudeI).toBe(100);
  });

  it("getMyNode returns undefined before setNodeNum; works after", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);
    db.addNode(makeNode(123));

    expect(db.getMyNode()).toBeUndefined();
    db.setNodeNum(123);

    const me = db.getMyNode();
    expect(me?.num).toBe(123);
  });

  it("setNodeNum merges nodes from a stale DB with the same myNodeNum", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(10);
    oldDB.setNodeNum(999);
    oldDB.addNode(makeNode(200));

    const newDB = st.addNodeDB(11);
    newDB.setNodeNum(999);

    expect(st.getNodeDB(10)).toBeUndefined();
    expect(st.getNodeDB(11)).toBeDefined();
    expect(newDB.getNode(200)).toBeTruthy();
  });

  it("partialize persists nodes; rehydrate rebuilds methods", async () => {
    {
      const { useNodeDBStore } = await freshStore(true);
      const st = useNodeDBStore.getState();
      const db = st.addNodeDB(123);
      db.setNodeNum(321);
      db.addNode(makeNode(50));
    }
    {
      const { useNodeDBStore } = await freshStore(true);
      const st = useNodeDBStore.getState();
      const db = st.getNodeDB(123)!;

      expect(db.getNode(50)?.num).toBe(50);
      db.addNode(makeNode(51));
      expect(db.getNode(51)).toBeTruthy();
    }
  });

  it("getNodes applies filter and excludes myNodeNum", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);
    db.setNodeNum(11);
    db.addNode(makeNode(10));
    db.addNode(makeNode(11));
    db.addNode(makeNode(12));

    const all = db.getNodes();
    expect(all.map((n) => n.num).sort()).toEqual([10, 12]);

    const filtered = db.getNodes((n) => n.num > 10);
    expect(filtered.map((n) => n.num).sort()).toEqual([12]);
  });

  it("will prune nodes after 14 days of inactivitiy", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);
    db.setNodeNum(10);
    const nowSec = Math.floor(Date.now() / 1000);
    db.addNode(makeNode(10, { lastHeard: nowSec }));
    db.addNode(makeNode(11, { lastHeard: nowSec - 15 * 86400 })); // stale
    db.addNode(makeNode(12, { lastHeard: nowSec - 5 * 86400 })); // fresh

    const pruned = db.pruneStaleNodes();
    expect(pruned).toBe(1);
    expect(db.getNode(10)).toBeTruthy();
    expect(db.getNode(11)).toBeUndefined();
    expect(db.getNode(12)).toBeTruthy();
  });

  it("removeNodeDB persists removal across reload", async () => {
    {
      const { useNodeDBStore } = await freshStore(true);
      const st = useNodeDBStore.getState();
      const db = st.addNodeDB(900);
      db.setNodeNum(7);
      db.addNode(makeNode(7));
      st.removeNodeDB(900);
    }
    {
      const { useNodeDBStore } = await freshStore(true);
      expect(useNodeDBStore.getState().getNodeDB(900)).toBeUndefined();
    }
  });

  it("on rehydrate only rebuilds DBs with myNodeNum set (orphans dropped)", async () => {
    {
      const { useNodeDBStore } = await freshStore(true);
      const st = useNodeDBStore.getState();
      const orphan = st.addNodeDB(500);
      orphan.addNode(makeNode(1));

      const real = st.addNodeDB(501);
      real.setNodeNum(42);
      real.addNode(makeNode(42));
    }
    {
      const { useNodeDBStore } = await freshStore(true);
      const st = useNodeDBStore.getState();
      expect(st.getNodeDB(500)).toBeUndefined();
      expect(st.getNodeDB(501)).toBeDefined();
    }
  });

  it("methods throw after their DB is removed from the map", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();
    const db = st.addNodeDB(800);

    st.removeNodeDB(800);

    expect(() => db.getNodesLength()).toThrow(/No nodeDB found/);
    expect(() => db.addNode(makeNode(1))).toThrow(/No nodeDB found/);
  });
});

describe("NodeDB merge semantics", () => {
  it("upserts node from a stale DB without dropping fields", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(10);
    oldDB.setNodeNum(999);
    oldDB.addNode(makeNode(200, { position: { altitude: 100 } }));

    const newDB = st.addNodeDB(11);
    newDB.addNode(makeNode(300));
    newDB.addNode(makeNode(200, { position: { altitude: 120 } }));
    newDB.setNodeNum(999);

    expect(st.getNodeDB(10)).toBeUndefined();
    expect(newDB.getNode(300)).toBeTruthy();
    const n200 = newDB.getNode(200)!;
    expect(n200.position?.altitude).toBe(120);
  });

  it("removeAllNodes (optionally keeping my node) persists across reload", async () => {
    {
      const { useNodeDBStore } = await freshStore(true);
      const st = useNodeDBStore.getState();
      const db = st.addNodeDB(1000);
      db.setNodeNum(55);
      db.addNode(makeNode(55, { user: { longName: "me" } }));
      db.addNode(makeNode(56));
      db.removeAllNodes(true);
    }
    {
      const { useNodeDBStore } = await freshStore(true);
      const st = useNodeDBStore.getState();
      const db = st.getNodeDB(1000)!;
      expect(db.getNode(55)).toBeTruthy();
      expect(db.getNode(56)).toBeUndefined();
    }
  });

  it("getMyNode works after merge establishes myNodeNum", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(1100);
    oldDB.setNodeNum(4242);
    oldDB.addNode(makeNode(4242));

    const newDB = st.addNodeDB(1101);
    newDB.setNodeNum(4242);

    expect(newDB.getMyNode()?.num).toBe(4242);
  });
});

describe("NodeDB deviceContext & debounce", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("useNodeDB resolves per-device DB and switches with deviceId", async () => {
    const { useNodeDBStore, useNodeDB } = await freshStore();

    deviceIdForTests = 1;
    const st = useNodeDBStore.getState();
    const db1 = st.addNodeDB(1);
    db1.addNode({ num: 10 } as any);

    function Comp() {
      const len = useNodeDB((db) => db.getNodesLength(), {
        debounce: 0,
        equality: (a, b) => a === b,
      });
      return <div data-testid="len">{len}</div>;
    }

    const { rerender } = render(<Comp />);
    expect(screen.getByTestId("len").textContent).toBe("1");

    deviceIdForTests = 2;
    const db2 = st.addNodeDB(2);
    db2.addNode({ num: 20 } as any);
    db2.addNode({ num: 21 } as any);
    db2.addNode({ num: 22 } as any);

    await act(async () => {
      rerender(<Comp />);
    });

    expect(screen.getByTestId("len").textContent).toBe("3");
  });

  it("useNodeDB selector re-renders only when the selected slice changes", async () => {
    const { useNodeDBStore, useNodeDB } = await freshStore();
    deviceIdForTests = 1;

    const st = useNodeDBStore.getState();
    const db = st.addNodeDB(1);

    let renders = 0;
    function Comp() {
      const len = useNodeDB((d) => d.getNodesLength(), {
        debounce: 0,
        equality: (a, b) => a === b,
      });
      renders++;
      return <div data-testid="len">{len}</div>;
    }

    render(<Comp />);
    expect(screen.getByTestId("len").textContent).toBe("0");
    expect(renders).toBe(1);

    // updateFavorite mutates a non-length slice
    db.addNode({ num: 1 } as any);
    db.updateFavorite(1, true);
    await act(() => Promise.resolve());
    // length stayed 1; selector slice unchanged after the favorite flip.
    expect(screen.getByTestId("len").textContent).toBe("1");

    // baseline grew (addNode triggered the first rerender), favourite update
    // should NOT have caused a second one.
    expect(renders).toBe(2);
  });

  it("useNodeDB debounce coalesces rapid updates", async () => {
    vi.useFakeTimers();
    const { useNodeDBStore, useNodeDB } = await freshStore();
    deviceIdForTests = 1;

    const st = useNodeDBStore.getState();
    const db = st.addNodeDB(1);

    let renders = 0;
    function Comp() {
      const len = useNodeDB((d) => d.getNodesLength(), {
        debounce: 50,
        equality: (a, b) => a === b,
      });
      renders++;
      return <div data-testid="len">{len}</div>;
    }

    render(<Comp />);

    db.addNode({ num: 1 } as any);
    db.addNode({ num: 2 } as any);
    db.addNode({ num: 3 } as any);

    await act(() => {
      vi.advanceTimersByTime(49);
    });
    expect(renders).toBe(1);

    await act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.getByTestId("len").textContent).toBe("3");
    expect(renders).toBe(2);

    vi.useRealTimers();
  });
});
