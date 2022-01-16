import React from 'react';

import mapbox from 'mapbox-gl';
import { FiMapPin, FiXCircle } from 'react-icons/fi';

import { Marker } from '@app/components/Map/Marker';
import type { Node } from '@app/core/slices/meshtasticSlice';
import { Drawer } from '@components/generic/Drawer';
import { Map } from '@components/Map';
import { NodeSidebar } from '@components/pages/nodes/NodeSidebar';
import { useAppSelector } from '@hooks/useAppSelector';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { IconButton } from '@meshtastic/components';

import { NodeCard } from '../components/pages/nodes/NodeCard';

export const Nodes = (): JSX.Element => {
  const myNodeInfo = useAppSelector((state) => state.meshtastic.radio.hardware);

  const nodes = useAppSelector((state) => state.meshtastic.nodes)
    .slice()
    .sort((a, b) =>
      a.number === myNodeInfo.myNodeNum
        ? 1
        : b?.lastHeard.getTime() - a?.lastHeard.getTime(),
    );

  const myNode = nodes.find((node) => node.number === myNodeInfo.myNodeNum);

  const { breakpoint } = useBreakpoint();
  const [navOpen, setNavOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState<Node | undefined>();

  return (
    <div className="relative flex w-full dark:text-white">
      <Drawer
        open={breakpoint === 'sm' ? navOpen : true}
        permenant={breakpoint !== 'sm'}
        onClose={(): void => {
          setNavOpen(!navOpen);
        }}
      >
        <div className="flex items-center justify-between m-6 mr-6">
          <div className="text-3xl font-extrabold leading-none tracking-tight">
            Nodes
          </div>
          <div className="md:hidden">
            <IconButton
              icon={<FiXCircle className="w-5 h-5" />}
              onClick={(): void => {
                setNavOpen(false);
              }}
            />
          </div>
        </div>
        {!nodes.length && (
          <span className="p-4 text-sm text-gray-400 dark:text-gray-600">
            No nodes found.
          </span>
        )}
        {myNode && (
          <NodeCard
            node={myNode}
            isMyNode={true}
            setSelected={(): void => {
              setSelectedNode(myNode);
              setSidebarOpen(true);
            }}
          />
        )}
        {nodes
          .filter((node) => node.number !== myNodeInfo.myNodeNum)
          .map((node) => (
            <NodeCard
              key={node.number}
              node={node}
              setSelected={(): void => {
                setSelectedNode(node);
                setSidebarOpen(true);
              }}
            />
          ))}
      </Drawer>

      {nodes.map((node) => {
        return (
          node.currentPosition && (
            <Marker
              center={
                new mapbox.LngLat(
                  node.currentPosition.longitudeI / 1e7,
                  node.currentPosition.latitudeI / 1e7,
                )
              }
            >
              <div
                onClick={(): void => {
                  setSelectedNode(node);
                  setSidebarOpen(true);
                }}
                className={`z-50 border-2  rounded-full bg-opacity-30 ${
                  node.number === selectedNode?.number
                    ? 'bg-green-500 border-green-500'
                    : 'bg-blue-500 border-blue-500'
                }`}
              >
                <div className="m-4 ">
                  <FiMapPin className="w-5 h-5" />
                </div>
              </div>
            </Marker>
          )
        );
      })}

      <Map />

      {sidebarOpen && selectedNode && (
        <NodeSidebar
          closeSidebar={(): void => {
            setSidebarOpen(false);
          }}
          node={selectedNode}
        />
      )}
    </div>
  );
};
