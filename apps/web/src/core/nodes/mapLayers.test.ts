import { describe, expect, it } from "vitest";
import {
  countVisibleLayers,
  defaultVisibilityState,
  MAP_LAYER_KEYS,
  toggleLayer,
} from "./mapLayers.ts";

describe("toggleLayer", () => {
  it("flips a single layer", () => {
    const next = toggleLayer(defaultVisibilityState, "positionPrecision");
    expect(next.positionPrecision).toBe(true);
    expect(next.nodeMarkers).toBe(true);
    expect(toggleLayer(next, "positionPrecision")).toEqual(
      defaultVisibilityState,
    );
  });

  it("turning the heatmap on hides every other layer", () => {
    const next = toggleLayer(defaultVisibilityState, "heatmap");
    expect(next.heatmap).toBe(true);
    expect(MAP_LAYER_KEYS.filter((key) => next[key])).toEqual(["heatmap"]);
  });

  it("turning the heatmap off leaves the others alone", () => {
    const on = toggleLayer(defaultVisibilityState, "heatmap");
    const withNodes = toggleLayer(on, "nodeMarkers");
    expect(toggleLayer(withNodes, "heatmap")).toMatchObject({
      heatmap: false,
      nodeMarkers: true,
    });
  });
});

describe("countVisibleLayers", () => {
  it("counts visible layers", () => {
    expect(countVisibleLayers(defaultVisibilityState)).toBe(2);
  });
});
