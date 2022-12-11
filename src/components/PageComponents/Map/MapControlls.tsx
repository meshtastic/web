import { FiCrosshair } from "react-icons/fi";
import { useMap } from "react-map-gl";

import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon
} from "@heroicons/react/24/outline";

export const MapControlls = (): JSX.Element => {
  const { current: map } = useMap();

  return (
    <div className="absolute right-0 top-0 z-10 m-2 ">
      <div className="divide-y divide-orange-300 overflow-hidden rounded-md bg-white shadow-md">
        <div
          className="cursor-pointer p-3 hover:bg-orange-200 hover:text-orange-700"
          onClick={() => {
            map?.zoomIn();
          }}
        >
          <MagnifyingGlassPlusIcon className="h-4 w-4" />
        </div>
        <div
          className="cursor-pointer p-3 hover:bg-orange-200 hover:text-orange-700"
          onClick={() => {
            map?.zoomOut();
          }}
        >
          <MagnifyingGlassMinusIcon className="h-4 w-4" />
        </div>
        <div
          className="cursor-pointer p-3 hover:bg-orange-200 hover:text-orange-700"
          onClick={() => {}}
        >
          <FiCrosshair className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};
