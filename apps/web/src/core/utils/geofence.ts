import { Protobuf } from "@meshtastic/sdk";
import { distanceMeters, type LngLat } from "./geo.ts";

const INT_DEG = 1e7;
const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;
const IMPERIAL_MILES_THRESHOLD_METERS = METERS_PER_MILE / 2;

export type UnitSystem = "metric" | "imperial";

/**
 * Waypoint UI reads the unit preference from the connected device's
 * DisplayConfig (matches existing patterns like the position-precision
 * selector in Channels/Channel.tsx). Falls back to metric when the config
 * isn't loaded yet.
 */
export function unitSystemFromDisplayUnits(
  units: Protobuf.Config.Config_DisplayConfig_DisplayUnits | undefined,
): UnitSystem {
  return units === Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL
    ? "imperial"
    : "metric";
}

export function metersToDisplay(meters: number, system: UnitSystem): number {
  if (system === "imperial") {
    return meters >= IMPERIAL_MILES_THRESHOLD_METERS
      ? meters / METERS_PER_MILE
      : meters / METERS_PER_FOOT;
  }
  return meters >= 1000 ? meters / 1000 : meters;
}

export function displayToMeters(
  value: number,
  system: UnitSystem,
  useLarge: boolean,
): number {
  if (system === "imperial") {
    return useLarge ? value * METERS_PER_MILE : value * METERS_PER_FOOT;
  }
  return useLarge ? value * 1000 : value;
}

export function pointInBoundingBox(
  point: LngLat,
  bbox: Protobuf.Mesh.BoundingBox,
): boolean {
  const [lng, lat] = point;
  const west = bbox.longitudeWestI / INT_DEG;
  const east = bbox.longitudeEastI / INT_DEG;
  const south = bbox.latitudeSouthI / INT_DEG;
  const north = bbox.latitudeNorthI / INT_DEG;

  if (lat < south || lat > north) return false;

  if (west <= east) {
    return lng >= west && lng <= east;
  }
  // Anti-meridian crossing
  return lng >= west || lng <= east;
}

export function pointInGeofence(
  point: LngLat,
  waypoint: Protobuf.Mesh.Waypoint,
): boolean {
  const center: LngLat = [
    (waypoint.longitudeI ?? 0) / INT_DEG,
    (waypoint.latitudeI ?? 0) / INT_DEG,
  ];
  if (waypoint.geofenceRadius > 0) {
    if (distanceMeters(point, center) <= waypoint.geofenceRadius) {
      return true;
    }
  }
  if (waypoint.boundingBox) {
    if (pointInBoundingBox(point, waypoint.boundingBox)) {
      return true;
    }
  }
  return false;
}

export function hasGeofence(waypoint: Protobuf.Mesh.Waypoint): boolean {
  return waypoint.geofenceRadius > 0 || waypoint.boundingBox !== undefined;
}

export function hasAnyNotify(waypoint: Protobuf.Mesh.Waypoint): boolean {
  return waypoint.notifyOnEnter || waypoint.notifyOnExit;
}

export function coordToDeg(coordI: number | undefined): number {
  return (coordI ?? 0) / INT_DEG;
}

export function degToCoordI(deg: number): number {
  return Math.round(deg * INT_DEG);
}
