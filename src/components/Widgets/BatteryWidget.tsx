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
        //convert to ms/%
        const msPerPercent = timeDiff / statDiff;
        const formatted = prettyMilliseconds(
          (100 - currentStat) * msPerPercent
        );
        setTimeRemaining(formatted);
      } else setTimeRemaining("Unknown");
    }
  }, [hardware.myNodeNum, nodes]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-white p-4 shadow">
      <dt>
        <div className="absolute rounded-md bg-indigo-500 p-3">
          <Battery100Icon className="h-6 text-white" aria-hidden="true" />
        </div>
        <p className="ml-16 truncate text-sm font-medium text-gray-500">
          Battery State
        </p>
      </dt>
      <dd className="ml-16 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">{batteryLevel}%</p>
        <p
          className={`ml-2 flex items-baseline text-sm font-semibold text-orange-600`}
        >
          <ClockIcon
            className="text-Orange-500 h-5 w-5 flex-shrink-0 self-center"
            aria-hidden="true"
          />
          {timeRemaining}
        </p>
      </dd>
    </div>
  );
};
