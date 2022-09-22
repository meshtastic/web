import type React from "react";

import maplibregl from "maplibre-gl";
import { Map, Marker, useMap } from "react-map-gl";

import { IconButton } from "@app/components/IconButton.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { MapPinIcon } from "@heroicons/react/24/outline";

export const MapPage = (): JSX.Element => {
  const { nodes, waypoints } = useDevice();
  const { current: map } = useMap();

  return (
    <div className="flex-grow">
      <div className="absolute z-10 right-0 top-0 m-2 rounded-md p-2 shadow-md bg-white">
        <div className="font-medium text-lg p-1">Title</div>
        <div className="flex flex-col gap-2">
          {nodes.map((n) => (
            <div key={n.data.num} className="flex gap-2">
              <Hashicon value={n.data.num.toString()} size={24} />
              <div>{n.data.user?.longName}</div>
              <IconButton
                icon={<MapPinIcon className="h-4" />}
                size="sm"
                onClick={() => {
                  if (n.data.position?.latitudeI) {
                    map?.flyTo({
                      center: [
                        n.data.position.longitudeI / 1e7,
                        n.data.position.latitudeI / 1e7,
                      ],
                      zoom: 10,
                    });
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
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
            <div>
              <MapPinIcon className="h-4" />
            </div>
          </Marker>
        ))}
        {nodes.map((n) => {
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
    </div>
  );
};
