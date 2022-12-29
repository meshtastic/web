import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { toMGRS } from "@core/utils/toMGRS.js";
import { MapPinIcon } from "@heroicons/react/24/outline";

export interface WaypointMessageProps {
  waypointID: number;
}

export const WaypointMessage = ({
  waypointID
}: WaypointMessageProps): JSX.Element => {
  const { waypoints } = useDevice();
  const waypoint = waypoints.find((wp) => wp.id === waypointID);

  return (
    <div className="border-l-slate-200 ml-4 border-l-2 pl-2">
      <div className="flex gap-2 rounded-md p-2">
        <MapPinIcon className="text-slate-600 m-auto w-6" />
        <div>
          <div className="flex gap-2">
            <div className="font-bold">{waypoint?.name}</div>
            <span className="text-slate-500 font-mono text-sm">
              {toMGRS(waypoint?.latitudeI, waypoint?.longitudeI)}
            </span>
          </div>
          <span className="text-sm">{waypoint?.description}</span>
        </div>
      </div>
    </div>
  );
};
