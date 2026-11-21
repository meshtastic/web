import { describe, expect, it } from "vitest";
import {
  DESKTOP_FIT_PADDING,
  parseMapView,
  pickInitialView,
  serializeMapView,
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
