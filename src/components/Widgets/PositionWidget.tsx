import type React from "react";

import { MapPinIcon } from "@heroicons/react/24/outline";

import { Card } from "../Card.js";
import { Dropdown } from "../Dropdown.js";

export interface PositionWidgetProps {
  grid: string;
}

export const PositionWidget = ({ grid }: PositionWidgetProps): JSX.Element => {
  return (
    <Card className="flex-col">
      <Dropdown title="Position" icon={<MapPinIcon className="h-4" />}>
        <div className="flex">
          <div className="flex w-20 bg-teal-600 p-3">
            <MapPinIcon className="m-auto h-12 text-white" />
          </div>
          <span className="m-auto text-lg">{grid}</span>
        </div>
      </Dropdown>
    </Card>
  );
};
