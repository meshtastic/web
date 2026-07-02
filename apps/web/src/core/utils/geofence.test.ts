import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  degToCoordI,
  displayToMeters,
  hasAnyNotify,
  hasGeofence,
  metersToDisplay,
  pointInBoundingBox,
  pointInGeofence,
  unitSystemFromLocale,
} from "./geofence.ts";

const bbox = (west: number, south: number, east: number, north: number) =>
  create(Protobuf.Mesh.BoundingBoxSchema, {
    longitudeWestI: degToCoordI(west),
    latitudeSouthI: degToCoordI(south),
    longitudeEastI: degToCoordI(east),
    latitudeNorthI: degToCoordI(north),
  });

const waypoint = (fields: Record<string, unknown>) =>
  create(Protobuf.Mesh.WaypointSchema, fields as never);

describe("geofence – locale units", () => {
  it("infers imperial from US English", () => {
    expect(unitSystemFromLocale("en-US")).toBe("imperial");
    expect(unitSystemFromLocale("en-us")).toBe("imperial");
  });
  it("defaults metric for other locales", () => {
    expect(unitSystemFromLocale("en-GB")).toBe("metric");
    expect(unitSystemFromLocale("de-DE")).toBe("metric");
    expect(unitSystemFromLocale(undefined)).toBe("metric");
  });

  it("round-trips display <-> meters", () => {
    expect(displayToMeters(1, "metric", false)).toBe(1);
    expect(displayToMeters(1, "metric", true)).toBe(1000);
    expect(Math.round(displayToMeters(1, "imperial", false))).toBe(0);
    expect(Math.round(displayToMeters(1, "imperial", true))).toBe(1609);
    expect(metersToDisplay(2000, "metric")).toBe(2);
    expect(metersToDisplay(500, "metric")).toBe(500);
  });
});

describe("geofence – point-in-region", () => {
  it("returns false when neither shape set", () => {
    expect(pointInGeofence([0, 0], waypoint({}))).toBe(false);
  });

  it("respects circular radius", () => {
    const wp = waypoint({
      latitudeI: degToCoordI(40),
      longitudeI: degToCoordI(-74),
      geofenceRadius: 1000,
    });
    expect(pointInGeofence([-74, 40], wp)).toBe(true);
    expect(pointInGeofence([-74, 40.005], wp)).toBe(true);
    expect(pointInGeofence([-74, 40.5], wp)).toBe(false);
  });

  it("respects bounding box (WSEN)", () => {
    const wp = waypoint({
      boundingBox: bbox(-74.1, 39.9, -73.9, 40.1),
    });
    expect(pointInGeofence([-74, 40], wp)).toBe(true);
    expect(pointInGeofence([-74.05, 39.95], wp)).toBe(true);
    expect(pointInGeofence([-73.5, 40], wp)).toBe(false);
    expect(pointInGeofence([-74, 41], wp)).toBe(false);
  });

  it("OR-combines circle and box", () => {
    const wp = waypoint({
      latitudeI: degToCoordI(40),
      longitudeI: degToCoordI(-74),
      geofenceRadius: 100,
      boundingBox: bbox(-70.1, 39.9, -69.9, 40.1),
    });
    expect(pointInGeofence([-74, 40], wp)).toBe(true);
    expect(pointInGeofence([-70, 40], wp)).toBe(true);
    expect(pointInGeofence([-72, 40], wp)).toBe(false);
  });

  it("handles anti-meridian crossing box", () => {
    const wp = waypoint({ boundingBox: bbox(170, -10, -170, 10) });
    expect(pointInBoundingBox([175, 0], wp.boundingBox!)).toBe(true);
    expect(pointInBoundingBox([-175, 0], wp.boundingBox!)).toBe(true);
    expect(pointInBoundingBox([0, 0], wp.boundingBox!)).toBe(false);
  });
});

describe("geofence – helpers", () => {
  it("hasGeofence detects either shape", () => {
    expect(hasGeofence(waypoint({}))).toBe(false);
    expect(hasGeofence(waypoint({ geofenceRadius: 10 }))).toBe(true);
    expect(hasGeofence(waypoint({ boundingBox: bbox(0, 0, 1, 1) }))).toBe(true);
  });

  it("hasAnyNotify detects either flag", () => {
    expect(hasAnyNotify(waypoint({}))).toBe(false);
    expect(hasAnyNotify(waypoint({ notifyOnEnter: true }))).toBe(true);
    expect(hasAnyNotify(waypoint({ notifyOnExit: true }))).toBe(true);
  });
});
