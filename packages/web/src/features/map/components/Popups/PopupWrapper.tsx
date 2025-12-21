import type { WaypointWithMetadata } from "@state/index.ts";
import { memo } from "react";
import { Popup } from "react-map-gl/maplibre";
import type { PxOffset } from "../cluster.ts";

export type PopupState =
  | { type: "node"; num: number; offset: PxOffset }
  | { type: "waypoint"; waypoint: WaypointWithMetadata };

export const PopupWrapper = memo(function SelectedNodePopup({
  lng,
  lat,
  offset,
  onClose,
  children,
}: {
  lng: number;
  lat: number;
  offset?: PxOffset;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Popup
      anchor="top"
      longitude={lng}
      latitude={lat}
      onClose={onClose}
      className="w-full"
      style={{
        left: `${offset?.[0] ?? 0}px`,
        top: `${(offset?.[1] ?? 0) + 22}px`,
      }}
    >
      {children}
    </Popup>
  );
});
