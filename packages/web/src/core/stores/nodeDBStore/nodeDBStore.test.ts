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

// import a fresh copy of the store module (because the store is created at import time)
async function freshStore() {
  vi.resetModules();
  const mod = await import("../nodeDBStore");
  return mod;
}

vi.mock("@core/services/featureFlags", () => {
  return {
    featureFlags: {
      get: vi.fn((key: string) => {
        if (key === "persistNodeDB") return true;
        return false;
      }),
    },
  };
});

function makeNode(num: number, extras: Record<string, any> = {}) {
  return { num, ...extras } as any;
}

describe("NodeDB store", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("addNodeDB returns same instance on repeated calls; getNodeDB works", async () => {
    const { useNodeDBStore } = await freshStore();

    const db1 = useNodeDBStore.getState().addNodeDB(123);
    const db2 = useNodeDBStore.getState().addNodeDB(123);
    expect(db1).toBe(db2);

    const got = useNodeDBStore.getState().getNodeDB(123);
    expect(got).toBe(db1);

    expect(useNodeDBStore.getState().getNodeDBs().length).toBe(1);
  });

  it("addNode, getNode(s), getNodesLength, removeNode", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);

    db.addNode(makeNode(10));
    db.addNode(makeNode(11));
    expect(db.getNodesLength()).toBe(2);
    expect(db.getNode(10)?.num).toBe(10);

    const all = db.getNodes();
    expect(all.map(n => n.num).sort()).toEqual([10, 11]);

    db.removeNode(10);
    expect(db.getNodesLength()).toBe(1);
    expect(db.getNode(10)).toBeUndefined();
  });

  it("processPacket creates or updates a node", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);

    db.processPacket({ from: 50, time: 1111, snr: 7 } as any);
    expect(db.getNode(50)).toBeTruthy();
    expect(db.getNode(50)?.lastHeard).toBe(1111);
    expect(db.getNode(50)?.snr).toBe(7);

    db.processPacket({ from: 50, time: 2222, snr: 9 } as any);
    expect(db.getNode(50)?.lastHeard).toBe(2222);
    expect(db.getNode(50)?.snr).toBe(9);
  });

  it("addUser and addPosition updates existing or creates new nodes", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);

    // addUser creates node if missing
    db.addUser({ from: 77, data: { id: "u" } } as any);
    expect(db.getNode(77)?.user).toEqual({ id: "u" });

    // addPosition updates same node
    db.addPosition({ from: 77, data: { lat: 1, lon: 2 } } as any);
    expect(db.getNode(77)?.position).toEqual({ lat: 1, lon: 2 });
    expect(db.getNode(77)?.num).toBe(77);
  });

  it("errors map: setNodeError, getNodeError, hasNodeError, clearNodeError", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);

    db.setNodeError(10, "BadFoo" as any);
    expect(db.hasNodeError(10)).toBe(true);
    expect(db.getNodeError(10)).toEqual({ node: 10, error: "BadFoo" });

    db.clearNodeError(10);
    expect(db.hasNodeError(10)).toBe(false);
    expect(db.getNodeError(10)).toBeUndefined();
  });

  it("getMyNode throws before setNodeNum; works after", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);
    db.addNode(makeNode(123));

    expect(() => db.getMyNode()).toThrow();
    db.setNodeNum(123);

    const me = db.getMyNode();
    expect(me.num).toBe(123);
  });

  it("setNodeNum merges with existing DB with same myNodeNum", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    
    const oldDB = st.addNodeDB(10);
    oldDB.setNodeNum(999);
    oldDB.addNode(makeNode(200));
    oldDB.setNodeError(200, "ERROR" as any);

    const newDB = st.addNodeDB(11);
    // newDB currently empty; setting same myNodeNum should copy maps from oldDB and delete old
    newDB.setNodeNum(999);

    expect(st.getNodeDB(10)).toBeUndefined();
    expect(st.getNodeDB(11)).toBeDefined();
    expect(newDB.getNode(200)).toBeTruthy();
    expect(newDB.getNodeError(200)).toEqual({ node: 200, error: "ERROR" });
  });

  it("setNodeNum does not merge when new DB already has nodes; old is removed", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(10);
    oldDB.setNodeNum(999);
    oldDB.addNode(makeNode(200)); // old has data

    const newDB = st.addNodeDB(11);
    newDB.addNode(makeNode(300)); // new has data -> no merge
    newDB.setNodeNum(999);

    expect(st.getNodeDB(10)).toBeUndefined(); // old removed
    // new kept its own nodes; did not copy old's
    expect(newDB.getNode(300)).toBeTruthy();
    expect(newDB.getNode(200)).toBeUndefined();
  });
  
  it("partialize persists only data, and onRehydrateStorage rebuilds methods", async () => {
    {
      const { useNodeDBStore } = await freshStore();
      const st = useNodeDBStore.getState();
      const db = st.addNodeDB(123);
      db.setNodeNum(321);
      db.addNode(makeNode(50));
      db.setNodeError(50, "ERROR" as any);
    }
    {
      const { useNodeDBStore } = await freshStore();
      const st = useNodeDBStore.getState();
      const db = st.getNodeDB(123)!;

      // methods should work after rehydrate
      expect(db.getNode(50)?.num).toBe(50);
      expect(db.getNodeError(50)).toEqual({ node: 50, error: "ERROR" });
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
    expect(all.map((n) => n.num).sort()).toEqual([10, 12]); // excludes my (11)

    const filtered = db.getNodes((n) => n.num > 10);
    expect(filtered.map((n) => n.num).sort()).toEqual([12]); // still excludes 11
  });

  it("when exceeding cap, evicts earliest inserted, not the newly added", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();
    for (let i = 1; i <= 10; i++) st.addNodeDB(i);
    st.addNodeDB(11);
    expect(st.getNodeDB(1)).toBeUndefined();
    expect(st.getNodeDB(11)).toBeDefined();
  });

  it("removeNodeDB persists removal across reload", async () => {
    {
      const { useNodeDBStore } = await freshStore();
      const st = useNodeDBStore.getState();
      st.addNodeDB(99);
      expect(st.getNodeDB(99)).toBeDefined();
      st.removeNodeDB(99);
      expect(st.getNodeDB(99)).toBeUndefined();
    }
    {
      const { useNodeDBStore } = await freshStore();
      const st = useNodeDBStore.getState();
      expect(st.getNodeDB(99)).toBeUndefined(); // still gone
    }
  });

  it("on rehydrate only rebuilds DBs with myNodeNum set (orphans dropped)", async () => {
    {
      const { useNodeDBStore } = await freshStore();
      const st = useNodeDBStore.getState();

      const orphan = st.addNodeDB(500); // no setNodeNum
      orphan.addNode(makeNode(1));

      const good = st.addNodeDB(501);
      good.setNodeNum(42);
      good.addNode(makeNode(2));
    }
    {
      const { useNodeDBStore } = await freshStore();
      const st = useNodeDBStore.getState();
      expect(st.getNodeDB(500)).toBeUndefined(); // orphan dropped
      expect(st.getNodeDB(501)).toBeDefined(); // kept
      expect(st.getNodeDB(501)!.getNode(2)).toBeTruthy();
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
