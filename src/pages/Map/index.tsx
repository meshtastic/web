import type React from 'react';
import { useState } from 'react';

import mapboxgl from 'mapbox-gl';
import { FiMapPin } from 'react-icons/fi';
import { RiRoadMapLine } from 'react-icons/ri';

import { Layout } from '@components/layout';
import { MapboxProvider } from '@components/MapBox/MapboxProvider';
import type { Node } from '@core/slices/meshtasticSlice';
import { useAppSelector } from '@hooks/useAppSelector';
import { MapContainer } from '@pages/Map/MapContainer';
import { Marker } from '@pages/Map/Marker';
import { NodeCard } from '@pages/Nodes/NodeCard';

export const Map = (): JSX.Element => {
  const [selectedNode, setSelectedNode] = useState<Node>();

  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const myNodeNum = useAppSelector(
    (state) => state.meshtastic.radio.hardware.myNodeNum,
  );

  return (
    <MapboxProvider>
      {nodes.map((node) => {
        return (
          node.currentPosition && (
            <Marker
              key={node.number}
              center={
                new mapboxgl.LngLat(
                  node.currentPosition.longitudeI / 1e7,
                  node.currentPosition.latitudeI / 1e7,
                )
              }
            >
              <div
                onClick={(): void => {
                  setSelectedNode(node);
                }}
                className={`z-50 rounded-full  border-2 bg-opacity-30 ${
                  node.number === selectedNode?.number
                    ? 'border-green-500 bg-green-500'
                    : 'border-blue-500 bg-blue-500'
                }`}
              >
                <div className="m-4 ">
                  <FiMapPin className="h-5 w-5" />
                </div>
              </div>
            </Marker>
          )
        );
      })}
      <Layout
        title="Nodes"
        icon={<RiRoadMapLine />}
        sidebarContents={
          <div className="flex flex-col gap-2">
            {!nodes.length && (
              <span className="p-4 text-sm text-gray-400 dark:text-gray-600">
                No nodes found.
              </span>
            )}

            {nodes.map((node) => (
              <NodeCard
                key={node.number}
                node={node}
                isMyNode={node.number === myNodeNum}
                selected={selectedNode?.number === node.number}
                setSelected={(): void => {
                  setSelectedNode(node);
                }}
              />
            ))}
          </div>
        }
      >
        <MapContainer />
      </Layout>
    </MapboxProvider>
  );
};
