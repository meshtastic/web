import maplibregl from "maplibre-gl";
import { Layer, Map, Marker, Source, useMap } from "react-map-gl";
import { useAppStore } from "@core/stores/appStore.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Sidebar } from "@app/components/Sidebar.js";
import { PageLayout } from "@app/components/PageLayout.js";
import {
  ZoomInIcon,
  ZoomOutIcon,
  BoxSelectIcon,
  MapPinIcon
} from "lucide-react";
import { bbox, lineString } from "@turf/turf";
import { SidebarSection } from "@app/components/UI/Sidebar/SidebarSection.js";
import { Button } from "@app/components/UI/Button.js";
import { SidebarButton } from "@app/components/UI/Sidebar/sidebarButton.js";

export const MapPage = (): JSX.Element => {
  const { nodes, waypoints } = useDevice();
  const { rasterSources } = useAppStore();
  const { default: map } = useMap();

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

  return (
    <>
      <Sidebar>
        <SidebarSection label="Sources">
          {rasterSources.map((source, index) => (
            <SidebarButton key={index} label={source.title} />
          ))}
        </SidebarSection>
      </Sidebar>
      <PageLayout
        label="Map"
        actions={[
          {
            icon: ZoomInIcon,
            onClick() {
              map?.zoomIn();
            }
          },
          {
            icon: ZoomOutIcon,
            onClick() {
              map?.zoomOut();
            }
          },
          {
            icon: BoxSelectIcon,
            onClick() {
              getBBox();
            }
          }
        ]}
      >
        <Map
          mapStyle="https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json"
          mapLib={maplibregl}
          attributionControl={false}
          renderWorldCopies={false}
          maxPitch={0}
          dragRotate={false}
          touchZoomRotate={false}
          initialViewState={{
            zoom: 10,
            latitude: -38,
            longitude: 145
          }}
        >
          {waypoints.map((wp) => (
            <Marker
              key={wp.id}
              longitude={wp.longitudeI / 1e7}
              latitude={wp.latitudeI / 1e7}
              anchor="bottom"
            >
              <div>
                <MapPinIcon size={16} />
              </div>
            </Marker>
          ))}
          {/* {rasterSources.map((source, index) => (
            <Source key={index} type="raster" {...source}>
              <Layer type="raster" />
            </Source>
          ))} */}
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
      </PageLayout>
    </>
  );
};
