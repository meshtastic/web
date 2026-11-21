import { describe, expect, it } from "vitest";
import {
  clampFitPadding,
  DESKTOP_FIT_PADDING,
  desktopFitPadding,
  FIT_OUTLIER_FLOOR_M,
  fitBoundsFor,
  greatCircleMeters,
  initialFitPhase,
  isMapLoadFailure,
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
    expect(DESKTOP_FIT_PADDING.left).toBe(352);
    expect(DESKTOP_FIT_PADDING.right).toBe(252);
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

type Point = [number, number];

// A Toronto-area mesh, from Kitchener to Oshawa and over to Niagara.
const cluster: Point[] = [
  [-79.38, 43.65],
  [-79.4, 43.7],
  [-79.2, 43.8],
  [-78.86, 43.9],
  [-79.87, 43.26],
  [-79.07, 43.09],
  [-80.49, 43.45],
  [-79.5, 43.6],
];
// jny1: Central Asia.
const centralAsia: Point = [69.24, 41.3];

const boundsTarget = (target: ReturnType<typeof fitBoundsFor>) => {
  if (target?.kind !== "bounds") {
    throw new Error(`expected bounds, got ${target?.kind}`);
  }
  return target.bounds;
};

describe("greatCircleMeters", () => {
  it("measures Toronto to New York at about 550 km", () => {
    const meters = greatCircleMeters([-79.38, 43.65], [-74.0, 40.71]);
    expect(meters).toBeGreaterThan(540_000);
    expect(meters).toBeLessThan(560_000);
  });

  it("goes the short way across the antimeridian", () => {
    expect(greatCircleMeters([179.9, 0], [-179.9, 0])).toBeLessThan(30_000);
  });
});

describe("fitBoundsFor", () => {
  it("has nothing to frame without points", () => {
    expect(fitBoundsFor([])).toBeUndefined();
  });

  it("frames a single node as a point", () => {
    expect(fitBoundsFor([[-79.38, 43.65]])).toEqual({
      kind: "point",
      center: [-79.38, 43.65],
    });
  });

  it("frames nodes sharing one spot as a point", () => {
    const spot: Point = [-79.38, 43.65];
    expect(fitBoundsFor([spot, spot, spot])).toEqual({
      kind: "point",
      center: spot,
    });
  });

  it("leaves a far-flung node out when anchored on the radio", () => {
    const [[west, south], [east, north]] = boundsTarget(
      fitBoundsFor([...cluster, centralAsia], [-79.38, 43.65]),
    );
    expect(west).toBe(-80.49);
    expect(east).toBe(-78.86);
    expect(south).toBe(43.09);
    expect(north).toBe(43.9);
  });

  it("leaves a far-flung node out when anchored on the median", () => {
    const [[west], [east]] = boundsTarget(
      fitBoundsFor([centralAsia, ...cluster]),
    );
    expect(west).toBe(-80.49);
    expect(east).toBe(-78.86);
  });

  it("leaves out a node far beyond a tight local mesh", () => {
    const newYork: Point = [-74.0, 40.71];
    const [, [east]] = boundsTarget(
      fitBoundsFor([...cluster, newYork], [-79.38, 43.65]),
    );
    expect(east).toBe(-78.86);
  });

  it("drops an outlier even among only three nodes", () => {
    const own: Point = [-79.38, 43.65];
    const near: Point = [-79.0, 43.9];
    expect(boundsTarget(fitBoundsFor([own, near, centralAsia], own))).toEqual([
      [-79.38, 43.65],
      [-79.0, 43.9],
    ]);
  });

  it("keeps every node of a spread-out mesh", () => {
    const spread: Point[] = [
      [-79.38, 43.65],
      [-73.57, 45.5],
      [-74.0, 40.71],
      [-71.06, 42.36],
      [-75.16, 39.95],
    ];
    expect(boundsTarget(fitBoundsFor(spread))).toEqual([
      [-79.38, 39.95],
      [-71.06, 45.5],
    ]);
  });

  it("keeps neighbours within the floor when most nodes share the anchor", () => {
    const own: Point = [-79.38, 43.65];
    // Half the mesh on one spot puts the median at zero.
    const nearby: Point = [-79.0, 43.9];
    expect(greatCircleMeters(own, nearby) < FIT_OUTLIER_FLOOR_M).toBe(true);
    expect(boundsTarget(fitBoundsFor([own, own, own, nearby], own))).toEqual([
      [-79.38, 43.65],
      [-79.0, 43.9],
    ]);
  });

  it("keeps regional nodes around a dense downtown core", () => {
    const own: Point = [-79.3832, 43.6532];
    const core: Point[] = [
      own,
      [-79.39, 43.66],
      [-79.37, 43.67],
      [-79.4, 43.64],
      [-79.36, 43.68],
      [-79.42, 43.65],
      [-79.38, 43.638],
    ];
    const regional: Point[] = [
      [-79.87, 43.26],
      [-78.86, 43.9],
      [-80.49, 43.45],
    ];
    expect(
      boundsTarget(fitBoundsFor([...core, ...regional, centralAsia], own)),
    ).toEqual([
      [-80.49, 43.26],
      [-78.86, 43.9],
    ]);
  });

  it("never frames fewer than two nodes", () => {
    expect(
      boundsTarget(fitBoundsFor([cluster[0] ?? [0, 1], centralAsia])),
    ).toEqual([
      [-79.38, 41.3],
      [69.24, 43.65],
    ]);
  });

  it("still frames the mesh when the radio sits far from it", () => {
    const own: Point = [69.24, 41.3];
    expect(
      boundsTarget(
        fitBoundsFor(
          [
            [-79.38, 43.65],
            [-79.4, 43.7],
            [-74.0, 40.71],
          ],
          own,
        ),
      ),
    ).toEqual([
      [-79.4, 40.71],
      [-74.0, 43.7],
    ]);
  });
});

describe("desktopFitPadding", () => {
  it("uses the constant geometry until the panels are measured", () => {
    expect(desktopFitPadding()).toEqual(DESKTOP_FIT_PADDING);
  });

  it("clears the measured panels by an inset and half a pin", () => {
    expect(desktopFitPadding({ left: 316, right: 216 })).toEqual({
      ...DESKTOP_FIT_PADDING,
      left: 352,
      right: 252,
    });
    expect(desktopFitPadding({ left: 340.4, right: 216 }).left).toBe(377);
  });

  it("falls back per side when a panel has no size yet", () => {
    expect(desktopFitPadding({ left: 0, right: 216 }).left).toBe(
      DESKTOP_FIT_PADDING.left,
    );
  });

  it("is left alone by the clamp at 1024 and 1440 wide windows", () => {
    // The map is the window minus the 72px rail.
    for (const width of [1024 - 72, 1440 - 72]) {
      const padding = desktopFitPadding({ left: 316, right: 216 });
      expect(clampFitPadding(padding, { width, height: 768 - 32 })).toEqual(
        padding,
      );
    }
  });
});

describe("isMapLoadFailure", () => {
  it("treats an error before any map exists as a failed load", () => {
    expect(isMapLoadFailure({ target: null })).toBe(true);
    expect(isMapLoadFailure({})).toBe(true);
  });

  it("ignores tile and style errors from a live map", () => {
    expect(isMapLoadFailure({ target: { loaded: () => true } })).toBe(false);
  });
});
