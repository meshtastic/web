type Position = [number, number];
type BBox = [number, number, number, number];

interface GeoJSONGeometry {
  type: string;
  coordinates: Position | Position[] | Position[][] | Position[][][];
}

interface Feature<G extends GeoJSONGeometry> {
  type: "Feature";
  geometry: G;
  properties: Record<string, unknown>;
}

interface LineStringGeometry {
  type: "LineString";
  coordinates: Position[];
}

function lineString(coordinates: Position[]): Feature<LineStringGeometry> {
  if (!coordinates || coordinates.length < 2) {
    throw new Error("coordinates must contain at least 2 positions");
  }

  for (const [index, coord] of coordinates.entries()) {
    if (!Array.isArray(coord) || coord.length !== 2) {
      throw new Error(`Invalid position at index ${index}`);
    }
    if (!coord.every((n) => typeof n === "number")) {
      throw new Error(`Position must contain numbers at index ${index}`);
    }
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

function bbox(geojson: Feature<GeoJSONGeometry> | GeoJSONGeometry): BBox {
  if (!geojson) {
    throw new Error("geojson is required");
  }

  const coords = getAllCoordinates(geojson);
  if (coords.length === 0) {
    throw new Error("No coordinates found in geojson");
  }

  const [west, south, east, north] = coords.reduce(
    ([minX, minY, maxX, maxY], [x, y]) => [
      Math.min(minX, x),
      Math.min(minY, y),
      Math.max(maxX, x),
      Math.max(maxY, y),
    ],
    [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ],
  );

  return [west, south, east, north];
}

function getAllCoordinates(
  geojson: Feature<GeoJSONGeometry> | GeoJSONGeometry,
): Position[] {
  const geometry =
    "type" in geojson && geojson.type === "Feature" && "geometry" in geojson
      ? geojson.geometry
      : geojson;
  const coords: Position[] = [];

  switch (geometry.type) {
    case "Point":
      coords.push(geometry.coordinates as Position);
      break;
    case "LineString":
    case "MultiPoint":
      coords.push(...(geometry.coordinates as Position[]));
      break;
    case "Polygon":
    case "MultiLineString":
      for (const line of geometry.coordinates as Position[][]) {
        coords.push(...line);
      }
      break;
    case "MultiPolygon":
      for (const poly of geometry.coordinates as Position[][][]) {
        for (const line of poly) {
          coords.push(...line);
        }
      }
      break;
    default:
      throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }

  return coords;
}

export { bbox, lineString };
