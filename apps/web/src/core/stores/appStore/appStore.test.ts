import type { RasterSource } from "@core/stores/appStore/types.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const idbMem = new Map<string, string>();
vi.mock("idb-keyval", () => ({
  get: vi.fn((key: string) => Promise.resolve(idbMem.get(key))),
  set: vi.fn((key: string, val: string) => {
    idbMem.set(key, val);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    idbMem.delete(key);
    return Promise.resolve();
  }),
}));

async function freshStore(persistApp = false) {
  vi.resetModules();

  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});

  vi.doMock("@core/services/featureFlags.ts", () => ({
    featureFlags: {
      get: vi.fn((key: string) => (key === "persistApp" ? persistApp : false)),
    },
  }));

  const storeMod = await import("./index.ts");
  return storeMod as typeof import("./index.ts");
}

function makeRaster(fields: Record<string, any>): RasterSource {
  return {
    enabled: true,
    title: "default",
    tiles: `https://default.com/default.json`,
    tileSize: 256,
    ...fields,
  };
}

describe("AppStore – basic state & actions", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("setters flip UI flags and numeric fields", async () => {
    const { useAppStore } = await freshStore(false);
    const state = useAppStore.getState();

    state.setSelectedDevice(42);
    expect(useAppStore.getState().selectedDeviceId).toBe(42);

    state.setCommandPaletteOpen(true);
    expect(useAppStore.getState().commandPaletteOpen).toBe(true);

    state.openConnections();
    expect(useAppStore.getState().connectionsDrawer).toEqual({
      open: true,
      view: "list",
    });
    state.openConnections("add");
    expect(useAppStore.getState().connectionsDrawer).toEqual({
      open: true,
      view: "add",
    });
    state.setConnectionsView("list");
    expect(useAppStore.getState().connectionsDrawer).toEqual({
      open: true,
      view: "list",
    });
    state.closeConnections();
    expect(useAppStore.getState().connectionsDrawer).toEqual({
      open: false,
      view: "list",
    });

    state.setNodeNumToBeRemoved(123);
    expect(useAppStore.getState().nodeNumToBeRemoved).toBe(123);

    state.setNodeNumDetails(777);
    expect(useAppStore.getState().nodeNumDetails).toBe(777);
  });

  it("setRasterSources replaces; addRasterSource appends; removeRasterSource splices by index", async () => {
    const { useAppStore } = await freshStore(false);
    const state = useAppStore.getState();

    const a = makeRaster({ title: "a" });
    const b = makeRaster({ title: "b" });
    const c = makeRaster({ title: "c" });

    state.setRasterSources([a, b]);
    expect(
      useAppStore.getState().rasterSources.map((raster) => raster.title),
    ).toEqual(["a", "b"]);

    state.addRasterSource(c);
    expect(
      useAppStore.getState().rasterSources.map((raster) => raster.title),
    ).toEqual(["a", "b", "c"]);

    // "b"
    state.removeRasterSource(1);
    expect(
      useAppStore.getState().rasterSources.map((raster) => raster.title),
    ).toEqual(["a", "c"]);
  });
});

describe("AppStore – persistence: partialize + rehydrate", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("persists only rasterSources; methods still work after rehydrate", async () => {
    // Write data
    {
      const { useAppStore } = await freshStore(true);
      const state = useAppStore.getState();

      state.setRasterSources([
        makeRaster({ title: "x" }),
        makeRaster({ title: "y" }),
      ]);
      state.setSelectedDevice(99);
      state.setCommandPaletteOpen(true);
      // Only rasterSources should persist by partialize
      expect(useAppStore.getState().rasterSources.length).toBe(2);
    }

    // Rehydrate from idbMem
    {
      const { useAppStore } = await freshStore(true);
      const state = useAppStore.getState();

      // persisted slice:
      expect(state.rasterSources.map((raster) => raster.title)).toEqual([
        "x",
        "y",
      ]);

      // ephemeral fields reset to defaults:
      expect(state.selectedDeviceId).toBe(0);
      expect(state.commandPaletteOpen).toBe(false);
      expect(state.connectionsDrawer).toEqual({ open: false, view: "list" });
      expect(state.nodeNumToBeRemoved).toBe(0);
      expect(state.nodeNumDetails).toBe(0);

      // methods still work post-rehydrate:
      state.addRasterSource(makeRaster({ title: "z" }));
      expect(
        useAppStore.getState().rasterSources.map((raster) => raster.title),
      ).toEqual(["x", "y", "z"]);
      state.removeRasterSource(0);
      expect(
        useAppStore.getState().rasterSources.map((raster) => raster.title),
      ).toEqual(["y", "z"]);
    }
  });

  it("removing and resetting sources persists across reload", async () => {
    {
      const { useAppStore } = await freshStore(true);
      const state = useAppStore.getState();
      state.setRasterSources([
        makeRaster({ title: "keep" }),
        makeRaster({ title: "drop" }),
      ]);
      state.removeRasterSource(1); // drop "drop"
      expect(
        useAppStore.getState().rasterSources.map((raster) => raster.title),
      ).toEqual(["keep"]);
    }
    {
      const { useAppStore } = await freshStore(true);
      const state = useAppStore.getState();
      expect(state.rasterSources.map((raster) => raster.title)).toEqual([
        "keep",
      ]);

      // Now replace entirely
      state.setRasterSources([]);
    }
    {
      const { useAppStore } = await freshStore(true);
      const state = useAppStore.getState();
      expect(state.rasterSources).toEqual([]); // stayed cleared
    }
  });
});

const IDB_KEY = "meshtastic-app-store";

const seed = (state: unknown, version: number) => {
  idbMem.set(IDB_KEY, JSON.stringify({ state, version }));
};

async function hydratedStore(persistApp: boolean) {
  const mod = await freshStore(persistApp);
  await vi.waitFor(() => {
    expect(mod.useAppStore.persist.hasHydrated()).toBe(true);
  });
  return mod;
}

describe("AppStore – node list sorts", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("starts every list at its default", async () => {
    const { useAppStore } = await hydratedStore(false);
    expect(useAppStore.getState().nodeListSorts).toEqual({
      nodes: { key: "lastHeard", direction: "desc", favoritesFirst: false },
      channelHeard: {
        key: "lastHeard",
        direction: "desc",
        favoritesFirst: false,
      },
    });
  });

  it("keeps each list's sort separately across reloads, even with persistApp off", async () => {
    {
      const { useAppStore } = await hydratedStore(false);
      useAppStore.getState().setNodeListSort("nodes", {
        key: "snr",
        direction: "asc",
        favoritesFirst: false,
      });
      useAppStore.getState().setNodeListSort("channelHeard", {
        key: "lastHeard",
        direction: "desc",
        favoritesFirst: true,
      });
    }
    {
      const { useAppStore } = await hydratedStore(false);
      expect(useAppStore.getState().nodeListSorts).toEqual({
        nodes: { key: "snr", direction: "asc", favoritesFirst: false },
        channelHeard: {
          key: "lastHeard",
          direction: "desc",
          favoritesFirst: true,
        },
      });
    }
  });

  it("migrates a version 0 store: raster sources kept, sorts defaulted", async () => {
    seed({ rasterSources: [makeRaster({ title: "old" })] }, 0);
    const { useAppStore, CURRENT_STORE_VERSION } = await hydratedStore(true);
    expect(CURRENT_STORE_VERSION).toBe(1);
    const state = useAppStore.getState();
    expect(state.rasterSources.map((raster) => raster.title)).toEqual(["old"]);
    expect(state.nodeListSorts.nodes.key).toBe("lastHeard");
    expect(state.nodeListSorts.channelHeard.favoritesFirst).toBe(false);
  });

  it("falls back to the default for an invalid stored sort, list by list", async () => {
    seed(
      {
        nodeListSorts: {
          nodes: { key: "rssi", direction: "asc", favoritesFirst: true },
          channelHeard: { key: "hops", direction: "asc", favoritesFirst: true },
        },
      },
      1,
    );
    const { useAppStore } = await hydratedStore(false);
    expect(useAppStore.getState().nodeListSorts).toEqual({
      nodes: { key: "lastHeard", direction: "desc", favoritesFirst: false },
      channelHeard: { key: "hops", direction: "asc", favoritesFirst: true },
    });
  });

  it("ignores stored raster sources while persistApp is off", async () => {
    seed({ rasterSources: [makeRaster({ title: "stale" })] }, 1);
    const { useAppStore } = await hydratedStore(false);
    expect(useAppStore.getState().rasterSources).toEqual([]);
  });
});

describe("migrateAppData", () => {
  it("defaults the sorts from version 0 and drops malformed raster sources", async () => {
    const { migrateAppData } = await freshStore(false);
    expect(
      migrateAppData(
        { rasterSources: [makeRaster({ title: "ok" }), { title: 3 }] },
        0,
      ),
    ).toEqual({
      nodeListSorts: {
        nodes: { key: "lastHeard", direction: "desc", favoritesFirst: false },
        channelHeard: {
          key: "lastHeard",
          direction: "desc",
          favoritesFirst: false,
        },
      },
      rasterSources: [makeRaster({ title: "ok" })],
    });
    expect(migrateAppData(null, 0)).toEqual({});
  });
});
