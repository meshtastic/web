import type React from "react";

import { MapPinIcon } from "@heroicons/react/24/outline";

export interface PositionWidgetProps {
  grid: string;
}

export const PositionWidget = ({ grid }: PositionWidgetProps): JSX.Element => {
  return (
    <div className="relative overflow-hidden rounded-lg bg-white p-4 shadow">
      <dt>
        <div className="absolute rounded-md bg-rose-500 p-3">
          <MapPinIcon className="h-6 text-white" aria-hidden="true" />
        </div>
        <p className="ml-16 truncate text-sm font-medium text-gray-500">
          Current Location
        </p>
      </dt>
      <dd className="ml-16 flex items-baseline">
        <p className="text-lg font-semibold text-gray-900">{grid}</p>
      </dd>
    </div>
  );
};
