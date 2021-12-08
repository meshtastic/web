import React from 'react';

import { FiCode, FiXCircle } from 'react-icons/fi';
import { MdGpsFixed, MdGpsNotFixed, MdGpsOff } from 'react-icons/md';
import TimeAgo from 'timeago-react';

import { useBreakpoint } from '@app/hooks/breakpoint';
import { useAppSelector } from '@app/hooks/redux';
import { Drawer } from '@components/generic/Drawer';
import { IconButton } from '@components/generic/IconButton';
import { Map } from '@components/Map';
import { Disclosure } from '@headlessui/react';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Nodes = (): JSX.Element => {
  const myNodeNum = useAppSelector(
    (state) => state.meshtastic.radio.hardware,
  ).myNodeNum;
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  // .filter(
  //   (node) => node.number !== myNodeNum,
  // );
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
        {nodes.map((node) => (
          <Disclosure
            as="div"
            className="m-2 rounded-md shadow-md bg-gray-50 dark:bg-gray-700"
            key={node.number}
          >
            <Disclosure.Button className="flex w-full gap-2 p-2 bg-gray-100 rounded-md shadow-md dark:bg-primaryDark">
              <div
                className={`my-auto w-3 h-3 rounded-full ${
                  node.lastHeard > new Date(Date.now() - 1000 * 60 * 15)
                    ? 'bg-green-500'
                    : node.lastHeard > new Date(Date.now() - 1000 * 60 * 30)
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              <div className="my-auto">{node.user?.longName}</div>
              <div className="my-auto ml-auto text-xs font-semibold">
                {node.lastHeard.getTime() ? (
                  <TimeAgo datetime={node.lastHeard} />
                ) : (
                  'Never'
                )}
              </div>
              {node.currentPosition ? (
                new Date(node.positions[0].posTimestamp * 1000) >
                new Date(new Date().getTime() - 1000 * 60 * 30) ? (
                  <IconButton icon={<MdGpsFixed />} />
                ) : (
                  <IconButton icon={<MdGpsNotFixed />} />
                )
              ) : (
                <IconButton disabled icon={<MdGpsOff />} />
              )}
            </Disclosure.Button>
            <Disclosure.Panel className="p-2">
              <div className="flex">
                <div className="my-auto">
                  {Protobuf.HardwareModel[node.user?.hwModel ?? 0]}
                </div>
                <div className="ml-auto">
                  <IconButton icon={<FiCode className="w-5 h-5" />} />
                </div>
              </div>
            </Disclosure.Panel>
          </Disclosure>
        ))}
      </Drawer>
      <Map />
    </div>
  );
};
