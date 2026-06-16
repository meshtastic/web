import { bbox, lineString } from "@turf/turf";

export type LngLat = [number, number];
export type Mercator = [number, number];
export type Bounds = [[number, number], [number, number]];

const INT_DEG = 1e7;
const EARTH_RADIUS = 6378137;

export const toLngLat = (position?: {
  latitudeI?: number;
  longitudeI?: number;
}): LngLat => [
  (position?.longitudeI ?? 0) / INT_DEG,
  (position?.latitudeI ?? 0) / INT_DEG,
];

export const hasPos = (position?: {
  latitudeI?: number;
  longitudeI?: number;
}) =>
  Number.isFinite(position?.latitudeI) &&
  Number.isFinite(position?.longitudeI) &&
  !(position?.latitudeI === 0 && position?.longitudeI === 0);

export const boundsFromLngLat = (coords: LngLat[]): Bounds | undefined => {
  if (coords.length === 0) {
    return undefined;
  }

  const turfCoords = coords.map(([lng, lat]) => [lat, lng]);
  const [minLat, minLng, maxLat, maxLng] = bbox(lineString(turfCoords));

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
};

const deg2rad = (d: number) => (d * Math.PI) / 180;
const rad2deg = (r: number) => (r * 180) / Math.PI;

export function lngLatToMercator([lng, lat]: LngLat): Mercator {
  return [
    EARTH_RADIUS * deg2rad(lng),
    EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + deg2rad(lat) / 2)),
  ];
}

export function mercatorToLngLat([x, y]: Mercator): LngLat {
  return [
    rad2deg(x / EARTH_RADIUS),
    rad2deg(2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2),
  ];
}

export function distanceMeters([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const phi1 = deg2rad(lat1),
    phi2 = deg2rad(lat2);
  const x = deg2rad(lng2 - lng1) * Math.cos((phi1 + phi2) * 0.5);
  const y = phi2 - phi1;
  return EARTH_RADIUS * Math.hypot(x, y);
}

export function precisionBitsToMeters(precisionBits: number): number {
  const M_PER_DEG_EQ = (2 * Math.PI * EARTH_RADIUS) / 360; // ≈ 111_319.490793 m/deg

  const stepInt = 2 ** (32 - precisionBits);
  const stepDegrees = stepInt / INT_DEG;
  return Math.round(0.5 * stepDegrees * M_PER_DEG_EQ);
}

export function bearingDegrees(from: LngLat, to: LngLat): number {
  const [lambda1deg, phi1deg] = from;
  const [lambda2deg, phi2deg] = to;

  const phi1 = deg2rad(phi1deg);
  const phi2 = deg2rad(phi2deg);
  const deltaLambda = deg2rad(lambda2deg - lambda1deg);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  return (rad2deg(Math.atan2(y, x)) + 360) % 360;
}
