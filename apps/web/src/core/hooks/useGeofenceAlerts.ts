import { router } from "@app/routes.tsx";
import { ToastAction, type ToastActionElement } from "@components/UI/Toast.tsx";
import { toast } from "@core/hooks/useToast.ts";
import { useAppStore, useDevice } from "@core/stores";
import { GeofenceCrossings } from "@core/utils/geofenceCrossings.ts";
import { useActiveClient } from "@meshtastic/sdk-react";
import { createElement, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Evaluates every incoming node position against every waypoint with a
 * geofence and any notify flag set. First sighting for a
 * `(waypointId, nodeNum)` pair only records a baseline (per design#114) —
 * subsequent transitions fire an enter/exit toast, gated by
 * `notify_favorites_only`. Toast carries an action that navigates to the
 * Map page and focuses the waypoint (design#114 "Notification action:
 * deep-link to the waypoint on the map").
 */
export function useGeofenceAlerts() {
  const client = useActiveClient();
  const device = useDevice();
  const setFocusWaypointId = useAppStore((s) => s.setFocusWaypointId);
  const { t } = useTranslation("map");
  const crossings = useRef(new GeofenceCrossings()).current;
  const waypointsRef = useRef(device.waypoints);
  waypointsRef.current = device.waypoints;

  useEffect(() => {
    if (!client) return;

    const dispose = client.events.onPositionPacket.subscribe((packet) => {
      const { from, data } = packet;
      if (data.latitudeI == null || data.longitudeI == null) return;
      const point: [number, number] = [data.longitudeI / 1e7, data.latitudeI / 1e7];
      const waypoints = waypointsRef.current;
      const events = crossings.evaluate(point, from, waypoints);
      if (events.length === 0) return;

      for (const event of events) {
        const wp = waypoints.find((w) => w.id === event.waypointId);
        if (!wp) continue;
        if (wp.notifyFavoritesOnly) {
          const node = client.nodes.byNum(from);
          if (!node?.isFavorite) continue;
        }
        const node = client.nodes.byNum(from);
        const nodeName = node?.user?.longName ?? String(from);
        toast({
          title:
            event.kind === "enter"
              ? t("waypointEdit.enterToast", { node: nodeName, waypoint: wp.name })
              : t("waypointEdit.exitToast", { node: nodeName, waypoint: wp.name }),
          action: createElement(
            ToastAction,
            {
              altText: t("waypointEdit.viewOnMap"),
              onClick: () => {
                setFocusWaypointId(wp.id);
                void router.navigate({ to: "/map" });
              },
            },
            t("waypointEdit.viewOnMap"),
          ) as unknown as ToastActionElement,
        });
      }
    });

    return () => {
      dispose();
      crossings.reset();
    };
  }, [client, crossings, setFocusWaypointId, t]);
}
