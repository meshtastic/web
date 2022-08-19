import type React from "react";
import { useRef } from "react";

import { majorScale, MapMarkerIcon, Pane } from "evergreen-ui";
import maplibregl from "maplibre-gl";
import Map, { Marker } from "react-map-gl";

import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";

export const MapPage = (): JSX.Element => {
  const { nodes, waypoints } = useDevice();

  // const nodeMarkers = useMemo(() => new Map<number, Marker>(), []);

  const ref = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   nodes.map((n) => {
  //     if (n.data.position?.longitudeI && n.data.position?.latitudeI && map) {
  //       if (nodeMarkers.has(n.data.num)) {
  //         nodeMarkers
  //           .get(n.data.num)
  //           ?.setLngLat([
  //             n.data.position?.longitudeI / 1e7,
  //             n.data.position?.latitudeI / 1e7,
  //           ]);
  //       } else {
  //         nodeMarkers.set(
  //           n.data.num,
  //           new Marker()
  //             .setLngLat([
  //               n.data.position?.longitudeI / 1e7,
  //               n.data.position?.latitudeI / 1e7,
  //             ])
  //             .addTo(map)
  //         );
  //       }
  //     }
  //   });
  // }, [map, nodeMarkers, nodes]);

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
      <Map
        mapStyle="https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json"
        mapLib={maplibregl}
      >
        {waypoints.map((wp) => (
          <Marker
            key={wp.id}
            longitude={wp.longitudeI / 1e7}
            latitude={wp.latitudeI / 1e7}
            anchor="bottom"
          >
            <Pane>
              <MapMarkerIcon />
            </Pane>
          </Marker>
        ))}
        {nodes
          .filter((n) => n.data.position?.latitudeI)
          .map((n) => {
            if (n.data.position?.latitudeI) {
              return (
                <Marker
                  key={n.data.num}
                  longitude={n.data.position.longitudeI / 1e7}
                  latitude={n.data.position.latitudeI / 1e7}
                  anchor="bottom"
                >
                  <Pane>
                    <Hashicon value={n.data.num.toString()} size={32} />
                  </Pane>
                </Marker>
              );
            }
          })}
      </Map>
    </Pane>
  );
};
