import type React from "react";

import { MapPinIcon } from "@heroicons/react/24/outline";

export interface PositionWidgetProps {
  grid: string;
}

export const PositionWidget = ({ grid }: PositionWidgetProps): JSX.Element => {
  return (
    <div className="flex gap-3 overflow-hidden rounded-lg bg-white p-3 shadow">
      <div className="rounded-md bg-rose-500 p-3">
        <MapPinIcon className="h-6 text-white" />
      </div>
      <div>
        <p className="truncate text-sm font-medium text-gray-500">
          Current Location
        </p>
        <div className="flex gap-1">
          <p className="text-lg font-semibold text-gray-900">{grid}</p>
        </div>
      </div>
    </div>
  );
};
