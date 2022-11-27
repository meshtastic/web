import type React from "react";

import maplibregl from "maplibre-gl";
import { Layer, Map, Marker, Source, useMap } from "react-map-gl";
import { base16 } from "rfc4648";

import { Card } from "@app/components/Card.js";
import { IconButton } from "@app/components/IconButton.js";
import { Mono } from "@app/components/Mono.js";
import { useAppStore } from "@app/core/stores/appStore.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import {
  EllipsisHorizontalCircleIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";

export const MapPage = (): JSX.Element => {
  const { nodes, waypoints } = useDevice();
  const { rasterSources } = useAppStore();
  const { current: map } = useMap();

  return (
    <div className="h-full flex-grow">
      <div className="absolute right-0 top-0 z-10 m-2">
        <Card className="flex-col p-3">
          <div className="p-1 text-lg font-medium">Title</div>
          <div className="flex flex-col gap-2">
            {nodes.map((n) => (
              <div
                className="flex gap-2 rounded-md p-2 hover:bg-slate-100"
                key={n.data.num}
              >
                <span className="my-auto shrink-0">
                  <Hashicon value={n.data.num.toString()} size={28} />
                </span>
                <div className="flex flex-col">
                  <span className="font-medium">{n.data.user?.longName}</span>
                  <Mono>
                    {base16
                      .stringify(n.data.user?.macaddr ?? [])
                      .match(/.{1,2}/g)
                      ?.join(":") ?? ""}
                  </Mono>
                </div>
                <div className="my-auto ml-auto">
                  <IconButton
                    variant="secondary"
                    size="sm"
                    icon={<EllipsisHorizontalCircleIcon className="h-4" />}
                    onClick={() => {
                      if (n.data.position?.latitudeI) {
                        map?.flyTo({
                          center: [
                            n.data.position.longitudeI / 1e7,
                            n.data.position.latitudeI / 1e7
                          ],
                          zoom: 10
                        });
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/*  */}
          {rasterSources.map((source, index) => (
            <div key={index}>{source.title}Tst</div>
          ))}
        </Card>
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
        {rasterSources.map((source, index) => (
          <Source key={index} type="raster" {...source}>
            <Layer type="raster" />
          </Source>
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
