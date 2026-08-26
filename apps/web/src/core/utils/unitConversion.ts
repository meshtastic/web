/**
 * Altitude unit conversion — pure functions, canonical is meters
 * (firmware Position.altitude int32 meters per mesh_pb.ts).
 * Display in feet when DisplayUnits is IMPERIAL.
 */

export const FEET_PER_METER = 3.28084;
export const METERS_PER_FOOT = 0.3048;

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

export function feetToMeters(feet: number): number {
  return feet * METERS_PER_FOOT;
}
