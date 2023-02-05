import { useEffect } from "react";

import { useMap } from "react-map-gl";

import { useDevice } from "@core/providers/useDevice.js";
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ShareIcon
} from "@heroicons/react/24/outline";
import { bbox, lineString } from "@turf/turf";

export const MapControlls = (): JSX.Element => {
  const { current: map } = useMap();
  const { nodes } = useDevice();

  const getBBox = () => {
    const nodesWithPosition = nodes.filter((n) => n.data.position?.latitudeI);
    if (!nodesWithPosition.length) return;
    const line = lineString(
      nodesWithPosition.map((n) => [
        (n.data.position?.latitudeI ?? 0) / 1e7,
        (n.data.position?.longitudeI ?? 0) / 1e7
      ])
    );
    const bounds = bbox(line);
    const center = map?.cameraForBounds(
      [
        [bounds[1], bounds[0]],
        [bounds[3], bounds[2]]
      ],
      { padding: { top: 10, bottom: 10, left: 10, right: 10 } }
    );
    if (center) map?.easeTo(center);
    else if (nodesWithPosition.length === 1)
      map?.easeTo({
        zoom: 12,
        center: [
          (nodesWithPosition[0].data.position?.longitudeI ?? 0) / 1e7,
          (nodesWithPosition[0].data.position?.latitudeI ?? 0) / 1e7
        ]
      });
  };

  useEffect(() => {
    getBBox();
  }, []);

  return (
    <div className="absolute right-0 top-0 z-10 m-2 ">
      <div className="divide-y-2 divide-backgroundSecondary overflow-hidden rounded-md bg-backgroundPrimary text-textSecondary">
        <div
          className="hover:bg-orange-200 cursor-pointer p-3 hover:text-accent"
          onClick={() => {
            map?.zoomIn();
          }}
        >
          <MagnifyingGlassPlusIcon className="h-4 w-4" />
        </div>
        <div
          className="hover:bg-orange-200 cursor-pointer p-3 hover:text-accent"
          onClick={() => {
            map?.zoomOut();
          }}
        >
          <MagnifyingGlassMinusIcon className="h-4 w-4" />
        </div>
        <div
          className="hover:bg-orange-200 cursor-pointer p-3 hover:text-accent"
          onClick={() => getBBox()}
        >
          <ShareIcon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};
