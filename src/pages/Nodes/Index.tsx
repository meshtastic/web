import React from 'react';

import { FiXCircle } from 'react-icons/fi';

import { useBreakpoint } from '@app/hooks/breakpoint';
import { useAppSelector } from '@app/hooks/redux';
import { Drawer } from '@components/generic/Drawer';
import { Map } from '@components/Map';
import { IconButton } from '@meshtastic/components';

import { NodeCard } from './NodeCard';

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
  const [navOpen, setNavOpen] = React.useState(false);

  const { breakpoint } = useBreakpoint();

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
          <div className="text-4xl font-extrabold leading-none tracking-tight">
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
        {myNode && <NodeCard node={myNode} myNodeInfo={myNodeInfo} />}
        {nodes
          .filter((node) => node.number !== myNodeInfo.myNodeNum)
          .map((node) => (
            <NodeCard key={node.number} node={node} />
          ))}
      </Drawer>
      <Map />
    </div>
  );
};
