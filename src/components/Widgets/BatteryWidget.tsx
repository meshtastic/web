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
  voltage
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
    <div className="flex gap-3 overflow-hidden rounded-lg bg-backgroundPrimary p-3 text-textSecondary">
      <div className="rounded-md bg-accent p-3 text-textPrimary">
        <Battery100Icon className="h-6" />
      </div>
      <div>
        <p className="truncate text-sm font-medium">Battery State</p>
        <div className="flex gap-1">
          <p className="text-xl font-semibold">{batteryLevel}%</p>
          <div className="flex text-sm font-semibold">
            <ClockIcon
              className="h-5 w-5 flex-shrink-0 self-center"
              aria-hidden="true"
            />
            <span className="my-auto">{timeRemaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
