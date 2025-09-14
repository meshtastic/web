import { TimeAgo } from "@components/generic/TimeAgo";
import { Separator } from "@components/UI/Separator.tsx";
import type { WaypointWithMetadata } from "@core/stores";
import { useNodeDB } from "@core/stores";
import {
  bearingDegrees,
  distanceMeters,
  hasPos,
  toLngLat,
} from "@core/utils/geo";
import type { Protobuf } from "@meshtastic/core";
import {
  ClockFadingIcon,
  ClockPlusIcon,
  CompassIcon,
  //Edit3Icon,
  MapPinnedIcon,
  MoveHorizontalIcon,
  NavigationIcon,
  RotateCwIcon,
  UserLockIcon,
  UserPenIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface WaypointDetailProps {
  waypoint: WaypointWithMetadata;
  myNode?: Protobuf.Mesh.NodeInfo;
  onEdit: () => void;
}

const RowElement: React.FC<{
  label: string;
  value: React.ReactNode | string | number | undefined;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex justify-between">
    <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-500">
      {icon} {label}
    </span>
    <span className="inline-flex items-center gap-1">{value}</span>
  </div>
);

export const WaypointDetail = ({
  waypoint,
  myNode,
  //onEdit,
}: WaypointDetailProps) => {
  const { t } = useTranslation("map");
  const { getNode } = useNodeDB();

  const waypointLngLat = toLngLat({
    latitudeI: waypoint.latitudeI,
    longitudeI: waypoint.longitudeI,
  });

  const distance = hasPos(myNode?.position)
    ? distanceMeters(toLngLat(myNode?.position), waypointLngLat)
    : undefined;

  const bearing = hasPos(myNode?.position)
    ? bearingDegrees(toLngLat(myNode?.position), waypointLngLat)
    : undefined;

  return (
    <div className="flex flex-col gap-2 px-1 text-sm dark:text-slate-900">
      <div className="flex items-center my-1 justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-900 ">
          {String.fromCodePoint(waypoint.icon) ?? "📍"}
          <span>{waypoint.name}</span>
        </div>
      </div>
      {waypoint.description && (
        <div>
          <span className="inline-flex items-center gap-1">
            {waypoint.description}
          </span>
        </div>
      )}
      <Separator className="dark:bg-slate-200" />
      <div className="flex justify-between">
        <span className="inline-flex items-start gap-2 text-slate-500 dark:text-slate-500">
          <MapPinnedIcon size="20" />
          <span>
            {t("waypointDetail.longitude")} {t("waypointDetail.latitude")}
          </span>
        </span>
        <span className="text-right">
          {waypointLngLat[0]} {waypointLngLat[1]}
        </span>
      </div>
      <RowElement
        label={t("waypointDetail.createdDate")}
        value={<TimeAgo timestamp={waypoint.metadata.created} />}
        icon={<ClockPlusIcon size="14" />}
      />
      {waypoint.metadata.updated && (
        <RowElement
          label={t("waypointDetail.updated")}
          value={<TimeAgo timestamp={waypoint.metadata.updated} />}
          icon={<RotateCwIcon size="14" />}
        />
      )}
      {waypoint.expire !== 0 && (
        <RowElement
          label={t("waypointDetail.expires")}
          value={<TimeAgo timestamp={waypoint.expire * 1000} />}
          icon={<ClockFadingIcon size="14" />}
        />
      )}
      {distance && (
        <RowElement
          label={t("waypointDetail.distance")}
          value={`${Math.round(distance)} ${distance === 1 ? t("unit.meter.one") : t("unit.meter.plural")}`}
          icon={<MoveHorizontalIcon size="14" />}
        />
      )}
      {bearing && (
        <RowElement
          label={t("waypointDetail.bearing")}
          value={
            <>
              <NavigationIcon
                size="16"
                aria-hidden
                className="shrink-0 origin-center transition-transform"
                style={{ transform: `rotate(${bearing - 45}deg)` }}
              />
              {Math.round(bearing)}°
            </>
          }
          icon={<CompassIcon size="14" />}
        />
      )}
      <RowElement
        label={t("waypointDetail.createdBy")}
        value={
          getNode(waypoint.metadata.from)?.user?.longName ??
          t("unknown.longName")
        }
        icon={<UserPenIcon size="14" />}
      />
      {
        waypoint.lockedTo ? (
          <RowElement
            label={t("waypointDetail.lockedTo")}
            value={
              getNode(waypoint.lockedTo)?.user?.longName ??
              t("unknown.longName")
            }
            icon={<UserLockIcon size="14" />}
          />
        ) : null /*(
        <div className="flex justify-end  ">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Edit3Icon className="h-4 w-4" />
            {t("waypointDetail.edit")}
          </button>
        </div>
      )*/
      }
    </div>
  );
};
