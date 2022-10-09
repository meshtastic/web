import type React from "react";
import { useEffect, useState } from "react";

import prettyMilliseconds from "pretty-ms";

import { useDevice } from "@app/core/providers/useDevice.js";
import { Battery100Icon, ClockIcon } from "@heroicons/react/24/outline";

export interface BatteryWidgetProps {
  batteryLevel: number;
  voltage: number;
}

export const BatteryWidget = ({
  batteryLevel,
  voltage,
}: BatteryWidgetProps): JSX.Element => {
  const { nodes, hardware } = useDevice();

  const [timeRemaining, setTimeRemaining] = useState("Unknown");

  useEffect(() => {
    const stats = nodes.find(
      (n) => n.data.num === hardware.myNodeNum
    )?.deviceMetrics;

    if (stats) {
      let currentStat: number | undefined = undefined;
      let currentTime = new Date();
      let previousStat: number | undefined = undefined;
      let previousTime = new Date();
      for (const stat of [...stats].reverse()) {
        if (stat.batteryLevel) {
          if (!currentStat) {
            currentStat = stat.batteryLevel;
            currentTime = stat.timestamp;
          } else {
            previousStat = stat.batteryLevel;
            previousTime = stat.timestamp;
            break;
          }
        }
      }

      if (currentStat && previousStat) {
        const timeDiff = currentTime.getTime() - previousTime.getTime();
        const statDiff = Math.abs(currentStat - previousStat);
        if (statDiff !== 0) {
          //convert to ms/%
          const msPerPercent = timeDiff / statDiff;
          const formatted = prettyMilliseconds(
            (100 - currentStat) * msPerPercent
          );
          setTimeRemaining(formatted);
        }
      } else setTimeRemaining("Unknown");
    }
  }, [hardware.myNodeNum, nodes]);

  return (
    <div className="flex gap-3 overflow-hidden rounded-lg bg-white p-3 shadow">
      <div className="rounded-md bg-indigo-500 p-3">
        <Battery100Icon className="h-6 text-white" />
      </div>
      <div>
        <p className="truncate text-sm font-medium text-gray-500">
          Battery State
        </p>
        <div className="flex gap-1">
          <p className="text-xl font-semibold text-gray-900">{batteryLevel}%</p>
          <div className={`flex text-sm font-semibold text-orange-600`}>
            <ClockIcon
              className="text-Orange-500 h-5 w-5 flex-shrink-0 self-center"
              aria-hidden="true"
            />
            <span className="my-auto">{timeRemaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
