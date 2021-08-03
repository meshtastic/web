import React from 'react';

import Avatar from 'boring-avatars';

import { Disclosure } from '@headlessui/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  FlagIcon,
  GlobeIcon,
  LightningBoltIcon,
} from '@heroicons/react/outline';
import type { Protobuf } from '@meshtastic/meshtasticjs';

import { useAppSelector } from '../../../hooks/redux';

export interface NodeProps {
  node: Protobuf.NodeInfo;
}

export const Node = (props: NodeProps): JSX.Element => {
  const myId = useAppSelector((state) => state.meshtastic.myId);

  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex bg-gray-50 w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex ml-4">
              {open ? (
                <ChevronDownIcon className="my-auto w-5 h-5 mr-2" />
              ) : (
                <ChevronRightIcon className="my-auto w-5 h-5 mr-2" />
              )}
              <div className="relative">
                {props.node.num === myId ? (
                  <FlagIcon className="absolute -right-1 -top-2 text-yellow-500 my-auto w-4 h-4" />
                ) : null}
                <Avatar
                  size={30}
                  name={props.node.user?.longName ?? 'Unknown'}
                  variant="beam"
                  colors={[
                    '#213435',
                    '#46685B',
                    '#648A64',
                    '#A6B985',
                    '#E1E3AC',
                  ]}
                />
              </div>
              {props.node.user?.longName}
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>
            <div className="border-b bg-gray-100 px-2">
              <p>{props.node.snr}</p>
              <p>
                {`Last heard: ${
                  props.node?.lastHeard
                    ? new Date(props.node.lastHeard).toLocaleString()
                    : 'Unknown'
                }`}{' '}
                {}
              </p>
              <div className="flex">
                <GlobeIcon className="my-auto mr-2 w-5 h-5" />
                <p>
                  {props.node.position?.latitudeI &&
                  props.node.position?.longitudeI
                    ? `${props.node.position.latitudeI / 1e7}, 
                                ${props.node.position.longitudeI / 1e7}`
                    : 'Unknown'}
                  , El:
                  {props.node.position?.altitude}
                </p>
              </div>

              <div className="flex">
                <ClockIcon className="my-auto mr-2 w-5 h-5" />
                <p>{props.node.position?.time}</p>
              </div>
              <div className="flex">
                <LightningBoltIcon className="my-auto mr-2 w-5 h-5" />
                <p>{props.node.position?.batteryLevel}</p>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};
