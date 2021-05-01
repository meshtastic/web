import React from 'react';

import { HashtagIcon } from '@heroicons/react/outline';
import { Protobuf } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../App';
import NavItem from '../NavItem';

interface SidebarChannelsProps {
  IsReady: boolean;
  Channels: Protobuf.Channel[];
  Translations: languageTemplate;
}

const SidebarChannels = (props: SidebarChannelsProps) => {
  return (
    <NavItem
      isDropdown={true}
      open={false}
      isNested={false}
      titleContent={
        <div className="flex">
          <HashtagIcon className="my-auto mr-2 2-5 h-5" />
          {props.Translations.device_channels_title}
        </div>
      }
      isLoading={!props.IsReady}
      dropdownContent={
        <>
          {props.Channels.map((channel, index) => {
            if (channel.role !== Protobuf.Channel_Role.DISABLED)
              return (
                <NavItem
                  key={index}
                  isDropdown={true}
                  isNested={true}
                  open={false}
                  titleContent={
                    <div className="flex">
                      {channel.index} - {Protobuf.Channel_Role[channel.role]}
                    </div>
                  }
                  dropdownContent={
                    <NavItem
                      isDropdown={false}
                      isNested={false}
                      open={false}
                      titleContent={
                        <div className="w-full">
                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Bandwidth:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.bandwidth}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Channel Number:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.channelNum}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Coding Rate:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.codingRate}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>ID:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.id}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Modem Config:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.modemConfig
                                ? Protobuf.ChannelSettings_ModemConfig[
                                    channel.settings.modemConfig
                                  ]
                                : null}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Name:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.name}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>PSK:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.psk.toLocaleString()}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Spread Factor:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.spreadFactor}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Tx Power:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.txPower}
                            </code>
                          </div>

                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Uplink:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.uplinkEnabled
                                ? 'true'
                                : 'false'}
                            </code>
                          </div>
                          <div className="flex justify-between border-b hover:bg-gray-200">
                            <p>Downlink:</p>
                            <code className="bg-gray-200 rounded-full px-2">
                              {channel.settings?.downlinkEnabled
                                ? 'true'
                                : 'false'}
                            </code>
                          </div>
                        </div>
                      }
                    />
                  }
                />
              );
          })}
        </>
      }
    />
  );
};

export default SidebarChannels;
