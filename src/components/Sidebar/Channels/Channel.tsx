import React from 'react';

import { Disclosure } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/outline';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface ChannelProps {
  channel: Protobuf.Channel;
}

export const Channel = (props: ChannelProps): JSX.Element => {
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
              {props.channel.index} -{' '}
              {Protobuf.Channel_Role[props.channel.role]}
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>
            <div className="w-full bg-gray-100 px-2">
              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Bandwidth:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.bandwidth}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Channel Number:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.channelNum}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Coding Rate:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.codingRate}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>ID:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.id}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Modem Config:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.modemConfig
                    ? Protobuf.ChannelSettings_ModemConfig[
                        props.channel.settings.modemConfig
                      ]
                    : null}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Name:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.name}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>PSK:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.psk.toLocaleString()}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Spread Factor:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.spreadFactor}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Tx Power:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.txPower}
                </code>
              </div>

              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Uplink:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.uplinkEnabled ? 'true' : 'false'}
                </code>
              </div>
              <div className="flex justify-between border-b hover:bg-gray-200">
                <p>Downlink:</p>
                <code className="bg-gray-200 rounded-full px-2">
                  {props.channel.settings?.downlinkEnabled ? 'true' : 'false'}
                </code>
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};
