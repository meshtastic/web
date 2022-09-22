import type React from "react";

import { MapPinIcon } from "@heroicons/react/24/outline";

import { Card } from "../Card.js";

export interface PositionWidgetProps {
  grid: string;
}

export const PositionWidget = ({ grid }: PositionWidgetProps): JSX.Element => {
  return (
    <Card>
      <div className="flex w-20 bg-teal-600 p-3">
        <MapPinIcon className="m-auto h-12 text-white" />
      </div>
      <div className="flex w-full flex-col">
        <div className="flex h-8 bg-slate-100">
          <span className="m-auto text-lg font-medium">Position</span>
        </div>
        <span className="m-auto text-lg">{grid}</span>
      </div>
    </Card>
  );
};
