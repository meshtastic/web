import { NodeMarker } from "@components/PageComponents/Map/Markers/NodeMarker.tsx";
import type { PopupState } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { PopupWrapper } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { WaypointDetail } from "@components/PageComponents/Map/Popups/WaypointDetail.tsx";
import { useMapFitting } from "@core/hooks/useMapFitting";
import { useDevice, type WaypointWithMetadata } from "@core/stores";
import type { Protobuf } from "@meshtastic/core";
import { useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export interface WaypointLayerProps {
  mapRef: MapRef | undefined;
  myNode: Protobuf.Mesh.NodeInfo | undefined;
  isVisible: boolean;
  popupState: PopupState | undefined;
  setPopupState: (state: PopupState | undefined) => void;
}

import { toLngLat } from "@core/utils/geo.ts";

export const WaypointLayer = ({
  mapRef,
  myNode,
  isVisible,
  popupState,
  setPopupState,
}: WaypointLayerProps): React.ReactNode[] => {
  const { waypoints } = useDevice();
  const { focusLngLat } = useMapFitting(mapRef);

  const onMarkerClick = useCallback(
    (waypoint: WaypointWithMetadata, e: { originalEvent: MouseEvent }) => {
      e.originalEvent?.stopPropagation();
      setPopupState({ type: "waypoint", waypoint });
      if (waypoint.longitudeI && waypoint.latitudeI) {
        focusLngLat(
          toLngLat({
            longitudeI: waypoint.longitudeI,
            latitudeI: waypoint.latitudeI,
          }),
        );
      }
    },
    [focusLngLat, setPopupState],
  );

  const rendered: React.ReactNode[] = [];
  if (!isVisible) {
    return rendered;
  }

  for (const waypoint of waypoints) {
    const [lng, lat] = toLngLat({
      latitudeI: waypoint.latitudeI,
      longitudeI: waypoint.longitudeI,
    });
    rendered.push(
      <NodeMarker
        key={`waypoint-${waypoint.id}`}
        id={waypoint.id}
        lng={lng}
        lat={lat}
        label={String.fromCodePoint(waypoint.icon) ?? "📍"}
        longLabel={waypoint.name}
        avatarClassName="bg-amber-400 border-amber-500"
        onClick={(_, e) => onMarkerClick(waypoint, e)}
      />,
    );
  }

  if (popupState?.type === "waypoint") {
    const [lng, lat] = toLngLat({
      latitudeI: popupState.waypoint.latitudeI,
      longitudeI: popupState.waypoint.longitudeI,
    });

    rendered.push(
      <PopupWrapper
        key={`popup-waypoint-${popupState.waypoint.id}`}
        lng={lng}
        lat={lat}
        offset={[0, 25]}
        onClose={() => setPopupState(undefined)}
      >
        <WaypointDetail
          waypoint={popupState.waypoint}
          myNode={myNode}
          onEdit={() => {}}
        />
      </PopupWrapper>,
    );
  }
  return rendered;
};
