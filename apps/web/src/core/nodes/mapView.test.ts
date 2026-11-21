import { describe, expect, it } from "vitest";
import {
  clampFitPadding,
  DESKTOP_FIT_PADDING,
  initialFitPhase,
  MAP_VIEW_STORAGE_KEY,
  MIN_FIT_SPAN,
  nextFitStep,
  parseMapView,
  pickInitialView,
  serializeMapView,
  shouldPersistMove,
  viewFromRouteParams,
} from "./mapView.ts";

const view = { longitude: -122.4, latitude: 37.8, zoom: 9 };

describe("parseMapView", () => {
  it("round-trips a serialised view", () => {
    expect(parseMapView(serializeMapView(view))).toEqual(view);
  });

  it("ignores missing, malformed and out-of-range values", () => {
    expect(parseMapView(null)).toBeUndefined();
    expect(parseMapView("not json")).toBeUndefined();
    expect(parseMapView('{"longitude":1,"latitude":2}')).toBeUndefined();
    expect(
      parseMapView('{"longitude":200,"latitude":2,"zoom":3}'),
    ).toBeUndefined();
    expect(
      parseMapView('{"longitude":"1","latitude":2,"zoom":3}'),
    ).toBeUndefined();
  });
});

describe("viewFromRouteParams", () => {
  it("reads parsed route params", () => {
    expect(viewFromRouteParams({ long: -122.4, lat: 37.8, zoom: 9 })).toEqual(
      view,
    );
  });

  it("accepts raw string segments", () => {
    expect(
      viewFromRouteParams({ long: "-122.4", lat: "37.8", zoom: "9" }),
    ).toEqual(view);
  });

  it("rejects out-of-range or non-numeric params", () => {
    expect(viewFromRouteParams({ long: 200, lat: 1, zoom: 1 })).toBeUndefined();
    expect(
      viewFromRouteParams({ long: "east", lat: 1, zoom: 1 }),
    ).toBeUndefined();
  });

  it("is undefined on the plain map route", () => {
    expect(viewFromRouteParams({})).toBeUndefined();
    expect(viewFromRouteParams(undefined)).toBeUndefined();
  });
});

describe("pickInitialView", () => {
  const saved = { longitude: 1, latitude: 2, zoom: 3 };

  it("prefers the route, then the saved view, then fitting to nodes", () => {
    expect(pickInitialView(view, saved)).toEqual({ kind: "route", view });
    expect(pickInitialView(undefined, saved)).toEqual({
      kind: "saved",
      view: saved,
    });
    expect(pickInitialView(undefined, undefined)).toEqual({
      kind: "fitNodes",
    });
  });
});

describe("fit padding", () => {
  it("clears the desktop node list and layers panels", () => {
    expect(DESKTOP_FIT_PADDING.left).toBe(332);
    expect(DESKTOP_FIT_PADDING.right).toBe(232);
  });
});

describe("MAP_VIEW_STORAGE_KEY", () => {
  it("does not reuse the key older builds wrote every camera move to", () => {
    expect(MAP_VIEW_STORAGE_KEY).not.toBe("meshtastic:mapView");
  });
});

describe("initialFitPhase", () => {
  it("only fits when there is no route or saved view", () => {
    expect(initialFitPhase({ kind: "fitNodes" })).toBe("pending");
    expect(initialFitPhase({ kind: "route", view })).toBe("done");
    expect(initialFitPhase({ kind: "saved", view })).toBe("done");
  });
});

describe("nextFitStep", () => {
  it("waits for the first node", () => {
    expect(nextFitStep("pending", 0)).toEqual({ fit: false, phase: "pending" });
  });

  it("fits once to several nodes", () => {
    expect(nextFitStep("pending", 3)).toEqual({ fit: true, phase: "done" });
    expect(nextFitStep("done", 5)).toEqual({ fit: false, phase: "done" });
  });

  it("refits once when a lone first node gains company", () => {
    const first = nextFitStep("pending", 1);
    expect(first).toEqual({ fit: true, phase: "fittedOne" });
    expect(nextFitStep(first.phase, 1)).toEqual({
      fit: false,
      phase: "fittedOne",
    });
    const second = nextFitStep(first.phase, 2);
    expect(second).toEqual({ fit: true, phase: "done" });
    expect(nextFitStep(second.phase, 4).fit).toBe(false);
  });

  it("never fits once the user has moved the map", () => {
    expect(nextFitStep("done", 1).fit).toBe(false);
    expect(nextFitStep("done", 9).fit).toBe(false);
  });
});

describe("shouldPersistMove", () => {
  it("saves only user moves after the initial view is in place", () => {
    expect(
      shouldPersistMove({ userInitiated: true, initialViewApplied: true }),
    ).toBe(true);
    expect(
      shouldPersistMove({ userInitiated: false, initialViewApplied: true }),
    ).toBe(false);
    expect(
      shouldPersistMove({ userInitiated: true, initialViewApplied: false }),
    ).toBe(false);
  });
});

describe("clampFitPadding", () => {
  it("leaves padding that fits alone", () => {
    expect(
      clampFitPadding(DESKTOP_FIT_PADDING, { width: 1600, height: 900 }),
    ).toEqual(DESKTOP_FIT_PADDING);
  });

  it("shrinks padding wider than the map, keeping each side's share", () => {
    const padding = clampFitPadding(DESKTOP_FIT_PADDING, {
      width: 500,
      height: 900,
    });
    expect(padding.left + padding.right).toBeLessThanOrEqual(
      500 - MIN_FIT_SPAN,
    );
    expect(padding.left).toBeGreaterThan(padding.right);
    expect(padding.top).toBe(DESKTOP_FIT_PADDING.top);
  });

  it("drops padding entirely on a map too small for any", () => {
    expect(
      clampFitPadding(DESKTOP_FIT_PADDING, { width: 40, height: 0 }),
    ).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});
