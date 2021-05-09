import React from 'react';

import { Disclosure } from '@headlessui/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  HashtagIcon,
} from '@heroicons/react/outline';
import { Protobuf } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../../App';
import Channel from './Channel';

export interface ChannelsProps {
  isReady: boolean;
  channels: Protobuf.Channel[];
  translations: languageTemplate;
}

const Channels = (props: ChannelsProps) => {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex">
              <HashtagIcon className="my-auto mr-2 2-5 h-5" />
              {props.translations.device_channels_title}
            </div>
            {open ? (
              <ChevronDownIcon className="my-auto group-hover:text-gray-700 w-5 h-5" />
            ) : (
              <ChevronRightIcon className="my-auto group-hover:text-gray-700 w-5 h-5" />
            )}
          </Disclosure.Button>
          <Disclosure.Panel>
            <>
              {props.channels.map((channel, index) => {
                if (channel.role !== Protobuf.Channel_Role.DISABLED)
                  return <Channel channel={channel} />;
              })}
            </>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Channels;
