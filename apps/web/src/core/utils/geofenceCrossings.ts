import type { WaypointWithMetadata } from "@core/stores";
import type { LngLat } from "@core/utils/geo.ts";
import { hasAnyNotify, hasGeofence, pointInGeofence } from "@core/utils/geofence.ts";

type CrossingKey = `${number}:${number}`;

export type GeofenceEvent = {
  waypointId: number;
  nodeNum: number;
  kind: "enter" | "exit";
};

/**
 * Point-in-region tracker with baseline-first `(waypointId, nodeNum)` state.
 * First sighting only sets a baseline (no event); subsequent transitions
 * across the region boundary emit an `enter` or `exit` event when the
 * matching `notify_on_*` flag is set.
 *
 * Callers must filter events for the favorites-only gate — this class is
 * intentionally pure and knows nothing about node favorite state.
 */
export class GeofenceCrossings {
  private state = new Map<CrossingKey, boolean>();

  reset(): void {
    this.state.clear();
  }

  evaluate(
    point: LngLat,
    nodeNum: number,
    waypoints: readonly WaypointWithMetadata[],
  ): GeofenceEvent[] {
    const events: GeofenceEvent[] = [];
    for (const wp of waypoints) {
      if (!hasGeofence(wp) || !hasAnyNotify(wp)) continue;

      const key = `${wp.id}:${nodeNum}` as CrossingKey;
      const inside = pointInGeofence(point, wp);
      const prior = this.state.get(key);

      if (prior === undefined) {
        this.state.set(key, inside);
        continue;
      }
      if (prior === inside) continue;
      this.state.set(key, inside);

      if (inside && wp.notifyOnEnter) {
        events.push({ waypointId: wp.id, nodeNum, kind: "enter" });
      } else if (!inside && wp.notifyOnExit) {
        events.push({ waypointId: wp.id, nodeNum, kind: "exit" });
      }
    }
    return events;
  }
}
