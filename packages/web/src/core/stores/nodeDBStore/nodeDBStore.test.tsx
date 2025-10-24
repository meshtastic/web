import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";
import { act, render, screen } from "@testing-library/react";
import { toByteArray } from "base64-js";
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

// import a fresh copy of the store module (because the store is created at import time)
async function freshStore(persist = false) {
  vi.resetModules();

  // suppress console output from the store during tests (for github actions)
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
function makeUser(fields: Record<string, any>) {
  return create(Protobuf.Mesh.UserSchema, fields);
}
function makePosition(fields: Record<string, any>) {
  return create(Protobuf.Mesh.PositionSchema, fields);
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
    expect(all.map((n) => n.num).sort()).toEqual([10, 11]);

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

    db.processPacket({ from: 50, time: 0, snr: 9 } as any);
    expect(db.getNode(50)?.lastHeard).toBeCloseTo(Date.now() / 1000, -1); // within 1s, note lastHeard is in seconds
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

  it("getMyNode returns undefined before setNodeNum; works after", async () => {
    const { useNodeDBStore } = await freshStore();
    const db = useNodeDBStore.getState().addNodeDB(1);
    db.addNode(makeNode(123));

    expect(db.getMyNode()).toBeUndefined();
    db.setNodeNum(123);

    const me = db.getMyNode();
    expect(me?.num).toBe(123);
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

  it("partialize persists only data, and onRehydrateStorage rebuilds methods", async () => {
    {
      const { useNodeDBStore } = await freshStore(true); // with persistence
      const st = useNodeDBStore.getState();
      const db = st.addNodeDB(123);
      db.setNodeNum(321);
      db.addNode(makeNode(50));
      db.setNodeError(50, "ERROR" as any);
    }
    {
      const { useNodeDBStore } = await freshStore(true); // with persistence
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
    for (let i = 1; i <= 10; i++) {
      st.addNodeDB(i);
    }
    st.addNodeDB(11);
    expect(st.getNodeDB(1)).toBeUndefined();
    expect(st.getNodeDB(11)).toBeDefined();
  });

  it("removeNodeDB persists removal across reload", async () => {
    {
      const { useNodeDBStore } = await freshStore(true); // with persistence
      const st = useNodeDBStore.getState();
      st.addNodeDB(99);
      expect(st.getNodeDB(99)).toBeDefined();
      st.removeNodeDB(99);
      expect(st.getNodeDB(99)).toBeUndefined();
    }
    {
      const { useNodeDBStore } = await freshStore(true); // with persistence
      const st = useNodeDBStore.getState();
      expect(st.getNodeDB(99)).toBeUndefined(); // still gone
    }
  });

  it("on rehydrate only rebuilds DBs with myNodeNum set (orphans dropped)", async () => {
    {
      const { useNodeDBStore } = await freshStore(true); // with persistence
      const st = useNodeDBStore.getState();

      const orphan = st.addNodeDB(500); // no setNodeNum
      orphan.addNode(makeNode(1));

      const good = st.addNodeDB(501);
      good.setNodeNum(42);
      good.addNode(makeNode(2));
    }
    {
      const { useNodeDBStore } = await freshStore(true); // with persistence
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

describe("NodeDB – merge semantics, PKI checks & extras", () => {
  const keyOld = toByteArray("40g5tLC6A+tXE92EyhwVwdiKsXwa1QUjZjkzEi0pCy4=");
  const keyNew = toByteArray("osxYoEP43oDeWZyjyKx1wz/5cvwEOthHB6AhO2fXEQg=");

  it("upserts node", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(10);
    oldDB.setNodeNum(999);
    oldDB.addNode(makeNode(200, { position: { altitude: 100 } }));

    const newDB = st.addNodeDB(11);
    newDB.addNode(makeNode(300));
    newDB.addNode(makeNode(200, { position: { altitude: 120 } }));
    newDB.setNodeNum(999);

    expect(st.getNodeDB(10)).toBeUndefined(); // old db removed
    expect(newDB.getNode(300)).toBeTruthy(); // node kept
    const n200 = newDB.getNode(200)!;
    expect(n200.position?.altitude).toBe(120); // replace existing
  });

  it("key conflict: keep old node, flag error", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(20);
    oldDB.setNodeNum(42);
    oldDB.addNode(
      makeNode(7, {
        user: makeUser({ publicKey: keyOld, longName: "old-7" }),
        position: makePosition({ latitudeI: 11, longitudeI: 22 }),
      }),
    );
    const newDB = st.addNodeDB(21);
    newDB.addNode(
      makeNode(7, {
        user: makeUser({ publicKey: keyNew, longName: "new-7" }),
        position: makePosition({ latitudeI: 33 }),
      }),
    );
    newDB.setNodeNum(42);

    const n7 = newDB.getNode(7)!;

    // node from old
    expect(n7.user?.longName).toBe("old-7");
    expect(n7.user?.publicKey).toEqual(keyOld);
    expect(n7.position?.latitudeI).toBe(11);
    expect(n7.position?.longitudeI).toBe(22);

    // error flagged
    const err = newDB.getNodeError(7);
    expect(err).toBeTruthy();
    expect(String(err!.error)).toMatch(/MISMATCH|PK/i);
  });

  it("empty new key; drop new node", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(30);
    oldDB.setNodeNum(77);
    oldDB.addNode(
      makeNode(5, { user: { publicKey: keyOld, longName: "old-5" } }),
    );

    const newDB = st.addNodeDB(31);
    newDB.addNode(
      makeNode(5, { user: { publicKey: new Uint8Array(), longName: "new-5" } }),
    );

    newDB.setNodeNum(77);

    // node from old
    const n5 = newDB.getNode(5)!;
    expect(n5.user?.publicKey).toEqual(keyOld); // keep old PK
    expect(n5.user?.longName).toBe("old-5");

    // error not flagged; dropped silently
    const err = newDB!.getNodeError(5);
    expect(err).toBeUndefined();
  });

  it("old key empty, new key present, store new node", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(40);
    oldDB.setNodeNum(1001);
    oldDB.addNode(makeNode(8, { user: { longName: "old-8" } })); // no key

    const newDB = st.addNodeDB(41);
    newDB.addNode(
      makeNode(8, {
        user: { publicKey: keyNew, longName: "new-8" },
        position: { altitude: 555 },
      }),
    );

    newDB.setNodeNum(1001);

    // node from new
    const n8 = newDB.getNode(8)!;
    expect(n8.user?.longName).toBe("new-8");
    expect(n8.user?.publicKey).toEqual(keyNew);
    expect(n8.position?.altitude).toBe(555);

    // no error
    const err = newDB.getNodeError(8);
    expect(err).toBeFalsy();
  });

  it("unions nodeErrors: preserves old and new, respects existing-on-conflict", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    const oldDB = st.addNodeDB(50);
    oldDB.setNodeNum(2020);
    oldDB.addNode(makeNode(1, { user: { longName: "old-1" } }));
    oldDB.setNodeError(1, "OLD_ERR" as any);

    const newDB = st.addNodeDB(51);
    newDB.addNode(makeNode(1, { user: { longName: "new-1" } }));
    newDB.addNode(makeNode(2, { user: { longName: "new-2" } }));
    newDB.setNodeError(2, "NEW_ERR" as any);

    // also set overlapping error
    newDB.setNodeError(1, "SHOULD_NOT_OVERWRITE" as any);

    newDB.setNodeNum(2020);

    expect(newDB.getNodeError(1)!.error).toBe("OLD_ERR"); // old kept
    expect(newDB.getNodeError(2)!.error).toBe("NEW_ERR"); // new added
  });

  it("eviction still honors cap after merge", async () => {
    const { useNodeDBStore } = await freshStore();
    const st = useNodeDBStore.getState();

    for (let i = 1; i <= 10; i++) {
      st.addNodeDB(i);
    }
    const oldDB = st.addNodeDB(100);
    oldDB.setNodeNum(12345);
    oldDB.addNode(makeNode(2000));

    const newDB = st.addNodeDB(101);
    newDB.setNodeNum(12345); // merges + deletes 100

    // adding another to trigger eviction of earliest non-merged entry (which was 1)
    st.addNodeDB(102);

    expect(st.getNodeDB(1)).toBeUndefined(); // evicted
    expect(st.getNodeDB(101)).toBeDefined(); // merged entry exists
    expect(st.getNodeDB(101)!.getNode(2000)).toBeTruthy(); // carried over
  });

  it("removeAllNodes (optionally keeping my node) and removeAllNodeErrors persist across reload", async () => {
    {
      const { useNodeDBStore } = await freshStore(true); // with persistence
      const st = useNodeDBStore.getState();
      const db = st.addNodeDB(1000);
      db.setNodeNum(55);
      db.addNode(makeNode(55, { user: { longName: "me" } }));
      db.addNode(makeNode(56));
      db.setNodeError(56, "ERR" as any);
      db.removeAllNodes(true);
      db.removeAllNodeErrors();
    }
    {
      const { useNodeDBStore } = await freshStore(true); // with persistence
      const st = useNodeDBStore.getState();
      const db = st.getNodeDB(1000)!;
      expect(db.getNode(55)).toBeTruthy(); // kept me
      expect(db.getNode(56)).toBeUndefined(); // cleared others
      expect(db.getNodeError(56)).toBeUndefined(); // cleared errors
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

    // device 1
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

    // switch to device 2 and add nodes
    deviceIdForTests = 2;
    const db2 = st.addNodeDB(2);
    db2.addNode({ num: 20 } as any);
    db2.addNode({ num: 21 } as any);
    db2.addNode({ num: 22 } as any);

    // re-render so the hook re-subscribes with the new deviceId
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

    // mutate something unrelated to length
    db.setNodeError(999, "X" as any);
    await act(() => Promise.resolve());
    expect(screen.getByTestId("len").textContent).toBe("0");
    expect(renders).toBe(1); // no re-render

    // now actually change the slice
    db.addNode({ num: 1 } as any);
    await act(() => Promise.resolve());
    expect(screen.getByTestId("len").textContent).toBe("1");
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

    // burst of updates within the debounce window
    db.addNode({ num: 1 } as any);
    db.addNode({ num: 2 } as any);
    db.addNode({ num: 3 } as any);

    await act(() => {
      vi.advanceTimersByTime(49);
    });
    expect(renders).toBe(1); // not yet

    await act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.getByTestId("len").textContent).toBe("3");
    expect(renders).toBe(2); // single coalesced re-render

    vi.useRealTimers();
  });
});
