import type React from "react";

import maplibregl from "maplibre-gl";
import { Layer, Map, Marker, Source } from "react-map-gl";

import { MapControlls } from "@app/components/PageComponents/Map/MapControlls.js";
import { useAppStore } from "@app/core/stores/appStore.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { MapPinIcon } from "@heroicons/react/24/outline";

export const MapPage = (): JSX.Element => {
  const { nodes, waypoints } = useDevice();
  const { rasterSources } = useAppStore();

  return (
    <div className="h-full flex-grow">
      <Map
        mapStyle="https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json"
        mapLib={maplibregl}
        attributionControl={false}
        renderWorldCopies={false}
        maxPitch={0}
        dragRotate={false}
        touchZoomRotate={false}
      >
        <MapControlls />
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
