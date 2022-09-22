import type React from "react";

import { BoltIcon } from "@heroicons/react/24/outline";

import { Card } from "../Card.js";

export interface BatteryWidgetProps {
  batteryLevel: number;
  voltage: number;
}

export const BatteryWidget = ({
  batteryLevel,
  voltage,
}: BatteryWidgetProps): JSX.Element => {
  return (
    <Card>
      <div className="flex w-20 bg-slate-700 p-3">
        <BoltIcon className="m-auto h-12 text-white" />
      </div>
      <div className="w-full">
        <div className="flex h-8 bg-slate-100">
          <span className="m-auto text-lg font-medium">Power</span>
        </div>
        <span>{batteryLevel}</span>
        <span>{voltage}</span>
      </div>
    </Card>
  );
};
