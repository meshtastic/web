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

    state.setConnectDialogOpen(true);
    expect(useAppStore.getState().connectDialogOpen).toBe(true);

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
      expect(state.connectDialogOpen).toBe(false);
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
