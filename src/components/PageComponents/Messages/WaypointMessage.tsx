import { useDevice } from "@core/stores/deviceStore.js";
import { toMGRS } from "@core/utils/toMGRS.js";
import { MapPinIcon } from "lucide-react";

export interface WaypointMessageProps {
  waypointID: number;
}

export const WaypointMessage = ({
  waypointID
}: WaypointMessageProps): JSX.Element => {
  const { waypoints } = useDevice();
  const waypoint = waypoints.find((wp) => wp.id === waypointID);

  return (
    <div className="ml-4 border-l-2 border-l-slate-200 pl-2">
      <div className="flex gap-2 rounded-md p-2">
        <MapPinIcon size={16} className="m-auto text-slate-600" />
        <div>
          <div className="flex gap-2">
            <div className="font-bold">{waypoint?.name}</div>
            <span className="font-mono text-sm text-slate-500">
              {toMGRS(waypoint?.latitudeI, waypoint?.longitudeI)}
            </span>
          </div>
          <span className="text-sm">{waypoint?.description}</span>
        </div>
      </div>
    </div>
  );
};
