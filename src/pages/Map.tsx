import maplibregl from "maplibre-gl";
import { Layer, Map, Marker, Source, useMap } from "react-map-gl";
import { useAppStore } from "@core/stores/appStore.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Sidebar } from "@components/Sidebar.js";
import { PageLayout } from "@components/PageLayout.js";
import {
  ZoomInIcon,
  ZoomOutIcon,
  BoxSelectIcon,
  MapPinIcon
} from "lucide-react";
import { bbox, lineString } from "@turf/turf";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.js";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.js";
import { Subtle } from "@app/components/UI/Typography/Subtle.js";
import { cn } from "@app/core/utils/cn.js";
import { useCallback, useEffect, useState } from "react";

export const MapPage = (): JSX.Element => {
  const { nodes, waypoints } = useDevice();
  const { rasterSources } = useAppStore();
  const { default: map } = useMap();

  const [zoom, setZoom] = useState(0);

  const allNodes = Array.from(nodes.values());

  const getBBox = () => {
    const nodesWithPosition = allNodes.filter(
      (node) => node.position?.latitudeI
    );
    if (!nodesWithPosition.length) return;
    const line = lineString(
      nodesWithPosition.map((n) => [
        (n.position?.latitudeI ?? 0) / 1e7,
        (n.position?.longitudeI ?? 0) / 1e7
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
          (nodesWithPosition[0].position?.longitudeI ?? 0) / 1e7,
          (nodesWithPosition[0].position?.latitudeI ?? 0) / 1e7
        ]
      });
  };

  useEffect(() => {
    map?.on("zoom", () => {
      setZoom(map?.getZoom() ?? 0);
    });
  }, [map, zoom]);

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
        noPadding
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
          // onClick={(e) => {
          //   const waypoint = new Protobuf.Waypoint({
          //     name: "test",
          //     description: "test description",
          //     latitudeI: Math.trunc(e.lngLat.lat * 1e7),
          //     longitudeI: Math.trunc(e.lngLat.lng * 1e7)
          //   });
          //   addWaypoint(waypoint);
          //   connection?.sendWaypoint(waypoint, "broadcast");
          // }}
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
          {allNodes.map((node) => {
            if (node.position?.latitudeI) {
              return (
                <Marker
                  key={node.num}
                  longitude={node.position.longitudeI / 1e7}
                  latitude={node.position.latitudeI / 1e7}
                  anchor="bottom"
                >
                  <div
                    className="flex cursor-pointer gap-2 rounded-md border bg-backgroundPrimary p-1.5"
                    onClick={() => {
                      map?.easeTo({
                        zoom: 12,
                        center: [
                          (node.position?.longitudeI ?? 0) / 1e7,
                          (node.position?.latitudeI ?? 0) / 1e7
                        ]
                      });
                    }}
                  >
                    <Hashicon value={node.num.toString()} size={22} />
                    <Subtle className={cn(zoom < 12 && "hidden")}>
                      {node.user?.longName}
                    </Subtle>
                  </div>
                </Marker>
              );
            }
          })}
        </Map>
      </PageLayout>
    </>
  );
};
