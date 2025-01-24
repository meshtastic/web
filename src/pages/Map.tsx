import { NodeDetail } from "@app/components/PageComponents/Map/NodeDetail";
import { Subtle } from "@app/components/UI/Typography/Subtle.tsx";
import { cn } from "@app/core/utils/cn.ts";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Hashicon } from "@emeraldpay/hashicon-react";
import type { Protobuf } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { bbox, lineString } from "@core/utils/maps";
import {
  BoxSelectIcon,
  MapPinIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { type JSX, useCallback, useEffect, useState } from "react";
import { AttributionControl, Marker, Popup, useMap } from "react-map-gl";
import MapGl from "react-map-gl/maplibre";

export const MapPage = (): JSX.Element => {
  const { nodes, waypoints } = useDevice();
  const { rasterSources, darkMode } = useAppStore();
  const { default: map } = useMap();

  const [zoom, setZoom] = useState(0);
  const [selectedNode, setSelectedNode] =
    useState<Protobuf.Mesh.NodeInfo | null>(null);

  const allNodes = Array.from(nodes.values());

  const getBBox = useCallback(() => {
    if (!map) {
      return;
    }
    const nodesWithPosition = allNodes.filter(
      (node) => node.position?.latitudeI,
    );
    if (!nodesWithPosition.length) {
      return;
    }
    if (nodesWithPosition.length === 1) {
      map.easeTo({
        zoom: 12,
        center: [
          (nodesWithPosition[0].position?.longitudeI ?? 0) / 1e7,
          (nodesWithPosition[0].position?.latitudeI ?? 0) / 1e7,
        ],
      });
      return;
    }
    const line = lineString(
      nodesWithPosition.map((n) => [
        (n.position?.latitudeI ?? 0) / 1e7,
        (n.position?.longitudeI ?? 0) / 1e7,
      ]),
    );
    const bounds = bbox(line);
    const center = map.cameraForBounds(
      [
        [bounds[1], bounds[0]],
        [bounds[3], bounds[2]],
      ],
      { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
    );
    if (center) {
      map.easeTo(center);
    }
  }, [allNodes, map]);

  useEffect(() => {
    map?.on("zoom", () => {
      setZoom(map?.getZoom() ?? 0);
    });
  }, [map]);

  useEffect(() => {
    map?.on("load", () => {
      getBBox();
    });
  }, [map, getBBox]);

  return (
    <>
      <Sidebar>
        <SidebarSection label="Sources">
          {rasterSources.map((source) => (
            <SidebarButton key={source.title} label={source.title} />
          ))}
        </SidebarSection>
      </Sidebar>
      <PageLayout
        label="Map"
        noPadding={true}
        actions={[
          {
            icon: ZoomInIcon,
            onClick() {
              map?.zoomIn();
            },
          },
          {
            icon: ZoomOutIcon,
            onClick() {
              map?.zoomOut();
            },
          },
          {
            icon: BoxSelectIcon,
            onClick() {
              getBBox();
            },
          },
        ]}
      >
        <MapGl
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

          // @ts-ignore

          attributionControl={false}
          renderWorldCopies={false}
          maxPitch={0}
          style={{
            filter: darkMode
              ? "brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)"
              : "",
          }}
          dragRotate={false}
          touchZoomRotate={false}
          initialViewState={{
            zoom: 1.6,
            latitude: 35,
            longitude: 0,
          }}
        >
          <AttributionControl
            style={{
              background: darkMode ? "#ffffff" : "",
              color: darkMode ? "black" : "",
            }}
          />
          {waypoints.map((wp) => (
            <Marker
              key={wp.id}
              longitude={(wp.longitudeI ?? 0) / 1e7}
              latitude={(wp.latitudeI ?? 0) / 1e7}
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
            if (node.position?.latitudeI && node.num !== selectedNode?.num) {
              return (
                <Marker
                  key={node.num}
                  longitude={(node.position.longitudeI ?? 0) / 1e7}
                  latitude={(node.position.latitudeI ?? 0) / 1e7}
                  style={{ filter: darkMode ? "invert(1)" : "" }}
                  anchor="bottom"
                  onClick={() => {
                    setSelectedNode(node);
                    map?.easeTo({
                      zoom: 12,
                      center: [
                        (node.position?.longitudeI ?? 0) / 1e7,
                        (node.position?.latitudeI ?? 0) / 1e7,
                      ],
                    });
                  }}
                >
                  <div className="flex cursor-pointer gap-2 rounded-md border bg-backgroundPrimary p-1.5">
                    <Hashicon value={node.num.toString()} size={22} />
                    <Subtle className={cn(zoom < 12 && "hidden")}>
                      {node.user?.longName ||
                        `!${numberToHexUnpadded(node.num)}`}
                    </Subtle>
                  </div>
                </Marker>
              );
            }
          })}
          {selectedNode?.position && (
            <Popup
              longitude={(selectedNode.position.longitudeI ?? 0) / 1e7}
              latitude={(selectedNode.position.latitudeI ?? 0) / 1e7}
              anchor="left"
              closeOnClick={false}
              onClose={() => setSelectedNode(null)}
            >
              <NodeDetail node={selectedNode} />
            </Popup>
          )}
        </MapGl>
      </PageLayout>
    </>
  );
};
