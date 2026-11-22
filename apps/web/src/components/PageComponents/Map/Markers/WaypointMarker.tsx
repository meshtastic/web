import { memo } from "react";
import { Marker, type MarkerEvent } from "react-map-gl/maplibre";

export interface WaypointMarkerProps {
  id: number;
  lng: number;
  lat: number;
  /** The waypoint's emoji. */
  icon: string;
  name: string;
  onClick: (id: number, event: MarkerEvent<MouseEvent>) => void;
}

/** A waypoint on the map: its emoji in a warning-toned pill, and its name. */
export const WaypointMarker = memo(function WaypointMarker({
  id,
  lng,
  lat,
  icon,
  name,
  onClick,
}: WaypointMarkerProps) {
  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      onClick={(event) => onClick(id, event)}
    >
      {/* Out of the tab order like node pins; waypoints open from the map. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={name}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-warning bg-surface py-0.5 pr-2.5 pl-1 text-meta font-medium text-primary shadow-floating"
      >
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full bg-warning text-body"
        >
          {icon}
        </span>
        <span aria-hidden="true" className="max-w-40 truncate">
          {name}
        </span>
      </button>
    </Marker>
  );
});
