import React from 'react';

import { Disclosure } from '@headlessui/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  DesktopComputerIcon,
  FlagIcon,
  GlobeIcon,
  LightningBoltIcon,
} from '@heroicons/react/outline';
import type { Types } from '@meshtastic/meshtasticjs';

export interface NodeProps {
  node: Types.NodeInfoPacket;
  myId: number;
}

const Node = (props: NodeProps): JSX.Element => {
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
              {props.node.data.num === props.myId ? (
                <FlagIcon className="text-yellow-500 my-auto mr-2 w-5 h-5" />
              ) : (
                <DesktopComputerIcon className="text-gray-600 my-auto mr-2 w-5 h-5" />
              )}
              {props.node.data.user?.longName}
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>
            <div className="border-b bg-gray-100 px-2">
              <p>
                SNR:{' '}
                {props.node.packet?.rxSnr ? props.node.packet.rxSnr : 'Unknown'}
              </p>
              <p>
                RSSI:{' '}
                {props.node.packet?.rxRssi
                  ? props.node.packet.rxRssi
                  : 'Unknown'}
              </p>
              <p>
                {`Last heard: ${
                  props.node.data?.lastHeard
                    ? new Date(props.node.data.lastHeard).toLocaleString()
                    : 'Unknown'
                }`}{' '}
                {}
              </p>
              <div className="flex">
                <GlobeIcon className="my-auto mr-2 w-5 h-5" />
                <p>
                  {props.node.data.position?.latitudeI &&
                  props.node.data.position?.longitudeI
                    ? `${props.node.data.position.latitudeI / 1e7}, 
                                ${props.node.data.position.longitudeI / 1e7}`
                    : 'Unknown'}
                  , El:
                  {props.node.data.position?.altitude}
                </p>
              </div>

              <div className="flex">
                <ClockIcon className="my-auto mr-2 w-5 h-5" />
                <p>{props.node.data.position?.time}</p>
              </div>
              <div className="flex">
                <LightningBoltIcon className="my-auto mr-2 w-5 h-5" />
                <p>{props.node.data.position?.batteryLevel}</p>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Node;
