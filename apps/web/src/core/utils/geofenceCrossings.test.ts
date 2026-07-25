import { create } from "@bufbuild/protobuf";
import type { WaypointWithMetadata } from "@core/stores";
import { degToCoordI } from "@core/utils/geofence.ts";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { GeofenceCrossings } from "./geofenceCrossings.ts";

function wp(fields: Record<string, unknown>): WaypointWithMetadata {
  const proto = create(Protobuf.Mesh.WaypointSchema, fields as never);
  return Object.assign(proto, {
    metadata: { channel: 0, created: new Date(), from: 0 },
  });
}

const center = { latitudeI: degToCoordI(40), longitudeI: degToCoordI(-74) };

describe("GeofenceCrossings – baseline-first semantics", () => {
  it("first sighting only records a baseline, no event", () => {
    const c = new GeofenceCrossings();
    const waypoints = [wp({ id: 1, ...center, geofenceRadius: 500, notifyOnEnter: true })];
    expect(c.evaluate([-74, 40], 42, waypoints)).toEqual([]);
    expect(c.evaluate([-70, 40], 42, waypoints)).toEqual([]);
  });

  it("emits enter on outside → inside transition", () => {
    const c = new GeofenceCrossings();
    const waypoints = [wp({ id: 1, ...center, geofenceRadius: 500, notifyOnEnter: true })];
    // Baseline outside
    c.evaluate([-70, 40], 42, waypoints);
    const events = c.evaluate([-74, 40], 42, waypoints);
    expect(events).toEqual([{ waypointId: 1, nodeNum: 42, kind: "enter" }]);
  });

  it("emits exit on inside → outside transition", () => {
    const c = new GeofenceCrossings();
    const waypoints = [wp({ id: 1, ...center, geofenceRadius: 500, notifyOnExit: true })];
    c.evaluate([-74, 40], 42, waypoints);
    const events = c.evaluate([-70, 40], 42, waypoints);
    expect(events).toEqual([{ waypointId: 1, nodeNum: 42, kind: "exit" }]);
  });

  it("skips waypoints with no notify flag set", () => {
    const c = new GeofenceCrossings();
    const waypoints = [wp({ id: 1, ...center, geofenceRadius: 500 })];
    c.evaluate([-70, 40], 42, waypoints);
    expect(c.evaluate([-74, 40], 42, waypoints)).toEqual([]);
  });

  it("skips waypoints with no geofence shape", () => {
    const c = new GeofenceCrossings();
    const waypoints = [wp({ id: 1, notifyOnEnter: true })];
    c.evaluate([-70, 40], 42, waypoints);
    expect(c.evaluate([-74, 40], 42, waypoints)).toEqual([]);
  });

  it("respects notify_on_exit only", () => {
    const c = new GeofenceCrossings();
    const waypoints = [wp({ id: 1, ...center, geofenceRadius: 500, notifyOnExit: true })];
    // Baseline outside then move inside: no notifyOnEnter → no event
    c.evaluate([-70, 40], 42, waypoints);
    expect(c.evaluate([-74, 40], 42, waypoints)).toEqual([]);
    // Move back outside → exit event
    expect(c.evaluate([-70, 40], 42, waypoints)).toEqual([
      { waypointId: 1, nodeNum: 42, kind: "exit" },
    ]);
  });

  it("tracks per-node state independently", () => {
    const c = new GeofenceCrossings();
    const waypoints = [
      wp({ id: 1, ...center, geofenceRadius: 500, notifyOnEnter: true, notifyOnExit: true }),
    ];
    // Node 1 starts inside baseline; node 2 starts outside baseline
    c.evaluate([-74, 40], 1, waypoints);
    c.evaluate([-70, 40], 2, waypoints);
    // Node 1 leaves → exit event, node 2 unchanged
    expect(c.evaluate([-70, 40], 1, waypoints)).toEqual([
      { waypointId: 1, nodeNum: 1, kind: "exit" },
    ]);
    expect(c.evaluate([-70, 40], 2, waypoints)).toEqual([]);
    // Node 2 enters → enter event
    expect(c.evaluate([-74, 40], 2, waypoints)).toEqual([
      { waypointId: 1, nodeNum: 2, kind: "enter" },
    ]);
  });

  it("tracks per-waypoint state independently", () => {
    const c = new GeofenceCrossings();
    const waypoints = [
      wp({
        id: 1,
        latitudeI: degToCoordI(40),
        longitudeI: degToCoordI(-74),
        geofenceRadius: 500,
        notifyOnEnter: true,
      }),
      wp({
        id: 2,
        latitudeI: degToCoordI(50),
        longitudeI: degToCoordI(-100),
        geofenceRadius: 500,
        notifyOnEnter: true,
      }),
    ];
    c.evaluate([-70, 40], 7, waypoints);
    // Enter waypoint 1 only
    const events = c.evaluate([-74, 40], 7, waypoints);
    expect(events).toEqual([{ waypointId: 1, nodeNum: 7, kind: "enter" }]);
  });

  it("reset() clears state so next call re-baselines", () => {
    const c = new GeofenceCrossings();
    const waypoints = [wp({ id: 1, ...center, geofenceRadius: 500, notifyOnEnter: true })];
    c.evaluate([-70, 40], 42, waypoints);
    c.evaluate([-74, 40], 42, waypoints); // enter
    c.reset();
    expect(c.evaluate([-74, 40], 42, waypoints)).toEqual([]); // baseline again
  });
});
