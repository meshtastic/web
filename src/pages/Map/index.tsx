import type React from "react";
import { useEffect, useMemo, useRef } from "react";

import { majorScale, Pane } from "evergreen-ui";
import { Marker } from "maplibre-gl";

import { useCreateMapbox } from "@app/core/providers/useCreateMapbox.js";
import { useDevice } from "@core/providers/useDevice.js";

export const MapPage = (): JSX.Element => {
  const { nodes } = useDevice();

  const nodeMarkers = useMemo(() => new Map<number, Marker>(), []);

  const ref = useRef<HTMLDivElement>(null);

  const map = useCreateMapbox({
    ref,
    style:
      "https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json",
  });

  useEffect(() => {
    nodes.map((n) => {
      if (n.data.position?.longitudeI && n.data.position?.latitudeI && map) {
        if (nodeMarkers.has(n.data.num)) {
          nodeMarkers
            .get(n.data.num)
            ?.setLngLat([
              n.data.position?.longitudeI / 1e7,
              n.data.position?.latitudeI / 1e7,
            ]);
        } else {
          nodeMarkers.set(
            n.data.num,
            new Marker()
              .setLngLat([
                n.data.position?.longitudeI / 1e7,
                n.data.position?.latitudeI / 1e7,
              ])
              .addTo(map)
          );
        }
      }
    });
  }, [map, nodeMarkers, nodes]);

  return (
    <Pane
      margin={majorScale(3)}
      borderRadius={majorScale(1)}
      background="white"
      elevation={1}
      display="flex"
      flexGrow={1}
      flexDirection="column"
      gap={majorScale(2)}
      overflow="hidden"
    >
      <Pane width="100%" height="100%" ref={ref} />
    </Pane>
  );
};
