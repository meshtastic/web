import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { generateGeofenceFeatures } from "./GeofenceLayer.tsx";

function makeWaypoint(fields: Record<string, unknown>) {
  const wp = create(Protobuf.Mesh.WaypointSchema, fields as never);
  return Object.assign(wp, {
    metadata: { channel: 0, created: new Date(), from: 1 },
  });
}

describe("GeofenceLayer – feature generation", () => {
  it("skips waypoints without a geofence", () => {
    const fc = generateGeofenceFeatures([makeWaypoint({ id: 1 })]);
    expect(fc.features).toHaveLength(0);
  });

  it("emits a circle polygon for radius > 0", () => {
    const fc = generateGeofenceFeatures([
      makeWaypoint({ id: 1, latitudeI: 400000000, longitudeI: -740000000, geofenceRadius: 500 }),
    ]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]!.properties.kind).toBe("circle");
    expect(fc.features[0]!.properties.waypointId).toBe(1);
  });

  it("emits a rectangle polygon for bounding box", () => {
    const box = create(Protobuf.Mesh.BoundingBoxSchema, {
      longitudeWestI: -740100000,
      latitudeSouthI: 399900000,
      longitudeEastI: -739900000,
      latitudeNorthI: 400100000,
    });
    const fc = generateGeofenceFeatures([makeWaypoint({ id: 2, boundingBox: box })]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]!.properties.kind).toBe("box");
    const ring = fc.features[0]!.geometry.coordinates[0]!;
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
  });

  it("emits both shapes when both are set", () => {
    const box = create(Protobuf.Mesh.BoundingBoxSchema, {
      longitudeWestI: 0,
      latitudeSouthI: 0,
      longitudeEastI: 1000000,
      latitudeNorthI: 1000000,
    });
    const fc = generateGeofenceFeatures([
      makeWaypoint({
        id: 3,
        latitudeI: 0,
        longitudeI: 0,
        geofenceRadius: 100,
        boundingBox: box,
      }),
    ]);
    expect(fc.features).toHaveLength(2);
    expect(fc.features.map((f) => f.properties.kind).sort()).toEqual(["box", "circle"]);
  });
});
