import type React from "react";

import {
  Heading,
  IconButton,
  LocateIcon,
  majorScale,
  MapMarkerIcon,
  Pane,
  Text,
} from "evergreen-ui";
import maplibregl from "maplibre-gl";
import { Map, Marker, useMap } from "react-map-gl";

import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";

export const MapPage = (): JSX.Element => {
  const { nodes, waypoints } = useDevice();
  const { current: map } = useMap();

  return (
    <Pane
      margin={majorScale(3)}
      borderRadius={majorScale(1)}
      elevation={1}
      display="flex"
      flexGrow={1}
      flexDirection="column"
      gap={majorScale(2)}
      overflow="hidden"
      position="relative"
    >
      <Pane
        position="absolute"
        zIndex={10}
        right={0}
        top={0}
        borderRadius={majorScale(1)}
        padding={majorScale(1)}
        margin={majorScale(1)}
        background="tint1"
        width={majorScale(28)}
        elevation={1}
        overflow="hidden"
      >
        <Pane padding={majorScale(1)} background="tint2">
          <Heading>Title</Heading>
        </Pane>
        <Pane display="flex" flexDirection="column" gap={majorScale(1)}>
          {nodes.map((n) => (
            <Pane key={n.data.num} display="flex" gap={majorScale(1)}>
              <Hashicon value={n.data.num.toString()} size={24} />
              <Text>{n.data.user?.longName}</Text>
              <IconButton
                icon={LocateIcon}
                marginLeft="auto"
                size="small"
                onClick={() => {
                  console.log("clicked");
                  console.log(map);

                  map?.flyTo({
                    center: [
                      n.data.position?.latitudeI / 1e7,
                      n.data.position?.longitudeI / 1e7,
                    ],
                    zoom: 10,
                  });
                }}
              />
            </Pane>
          ))}
        </Pane>
      </Pane>
      <Map
        mapStyle="https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json"
        mapLib={maplibregl}
        attributionControl={false}
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
                  <Hashicon value={n.data.num.toString()} size={32} />
                </Marker>
              );
            }
          })}
      </Map>
    </Pane>
  );
};
