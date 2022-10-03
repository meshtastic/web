import type React from "react";

import { Battery100Icon, BoltIcon } from "@heroicons/react/24/outline";

import { Card } from "../Card.js";
import { Dropdown } from "../Dropdown.js";
import { Mono } from "../Mono.js";

export interface BatteryWidgetProps {
  batteryLevel: number;
  voltage: number;
}

export const BatteryWidget = ({
  batteryLevel,
  voltage,
}: BatteryWidgetProps): JSX.Element => {
  return (
    <Card className="flex-col">
      <Dropdown title="Battery" icon={<BoltIcon className="h-4" />}>
        <div className="flex">
          <div className="flex w-20 bg-slate-700 p-3">
            <Battery100Icon className="m-auto h-12 text-white" />
          </div>
          <span className="m-auto text-lg">
            {batteryLevel}
            <Mono>%</Mono>
          </span>
          <span className="m-auto text-lg">
            {voltage.toPrecision(2)}
            <Mono>v</Mono>
          </span>
        </div>
      </Dropdown>
    </Card>
  );
};
