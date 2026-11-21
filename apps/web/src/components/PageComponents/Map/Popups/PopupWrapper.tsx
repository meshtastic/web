import { IconButton } from "@components/UI/IconButton.tsx";
import type { PxOffset } from "@core/nodes/cluster.ts";
import type { WaypointWithMetadata } from "@core/stores";
import { XIcon } from "lucide-react";
import { memo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Marker } from "react-map-gl/maplibre";

export type PopupState =
  | { type: "node"; num: number; offset: PxOffset }
  | { type: "waypoint"; waypoint: WaypointWithMetadata };

/**
 * A themed card anchored under a map point, with a close button. Drawn as a
 * marker rather than a maplibre popup so it uses the app's surface tokens.
 */
export const PopupWrapper = memo(function PopupWrapper({
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
  children: ReactNode;
}) {
  const { t } = useTranslation("map");
  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="top"
      offset={[offset?.[0] ?? 0, (offset?.[1] ?? 0) + 8]}
      style={{ zIndex: 4 }}
      onClick={(event) => event.originalEvent.stopPropagation()}
    >
      <div className="relative w-64 rounded-panel border border-control bg-surface p-3 pr-10 text-primary shadow-dialog">
        <IconButton
          aria-label={t("selected.close")}
          size="sm"
          icon={<XIcon className="size-4" />}
          onClick={onClose}
          className="absolute top-2 right-2"
        />
        {children}
      </div>
    </Marker>
  );
});
