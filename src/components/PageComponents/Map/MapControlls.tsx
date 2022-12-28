import { FiCrosshair } from "react-icons/fi";
import { useMap } from "react-map-gl";
import { lineString, bbox } from "@turf/turf";

import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ShareIcon
} from "@heroicons/react/24/outline";
import { useDevice } from "@app/core/providers/useDevice.js";

export const MapControlls = (): JSX.Element => {
  const { current: map } = useMap();
  const { nodes } = useDevice();

  const getBBox = () => {
    const nodesWithPosition = nodes.filter((n) => n.data.position?.latitudeI);

    if (nodesWithPosition.length > 1) {
      const line = lineString(
        nodesWithPosition.map((n) => [
          (n.data.position?.latitudeI ?? 0) / 1e7,
          (n.data.position?.longitudeI ?? 0) / 1e7
        ])
      );

      const bounds = bbox(line);

      const center = map?.cameraForBounds([
        [bounds[1], bounds[0]],
        [bounds[3], bounds[2]]
      ]);

      if (center) {
        map?.easeTo(center);
      }
    } else if (nodesWithPosition.length === 1) {
      map?.easeTo({
        zoom: 12,
        center: [
          (nodesWithPosition[0].data.position?.longitudeI ?? 0) / 1e7,
          (nodesWithPosition[0].data.position?.latitudeI ?? 0) / 1e7
        ]
      });
    }
  };

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
        <div
          className="cursor-pointer p-3 hover:bg-orange-200 hover:text-orange-700"
          onClick={() => getBBox()}
        >
          <ShareIcon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};
