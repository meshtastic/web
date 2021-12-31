import React from 'react';

import { FiHash } from 'react-icons/fi';

import { Message } from '@components/chat/Message';
import { MessageBar } from '@components/chat/MessageBar';
import { Select } from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { useAppSelector } from '../hooks/redux';

export const Messages = (): JSX.Element => {
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const channels = useAppSelector((state) => state.meshtastic.radio.channels);
  const [channelIndex, setChannelIndex] = React.useState(0);

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between w-full px-2 border-b dark:border-gray-600 dark:text-gray-300">
        <div className="flex py-2 my-auto text-sm">
          <FiHash className="w-4 h-4 my-auto mr-1" />
          <Select
            options={channels
              .filter(
                (channel) =>
                  channel.channel.role !== Protobuf.Channel_Role.DISABLED &&
                  channel.channel.settings?.name !== 'admin',
              )
              .map((channel) => {
                return {
                  name: channel.channel.settings?.name.length
                    ? channel.channel.settings.name
                    : channel.channel.role === Protobuf.Channel_Role.PRIMARY
                    ? 'Primary'
                    : `CH: ${channel.channel.index}`,
                  value: channel.channel.index,
                };
              })}
            onChange={(e): void => {
              setChannelIndex(parseInt(e.target.value));
            }}
            small
          />
        </div>
      </div>
      <div className="flex flex-col flex-grow p-6 space-y-2 overflow-y-auto bg-white border-b border-gray-300 md:py-8 md:px-10 dark:border-gray-600 dark:bg-secondaryDark">
        {channels[channelIndex]?.messages.map((message, index) => (
          <Message
            key={index}
            isSender={message.isSender}
            message={message.message.data}
            ack={message.ack}
            rxTime={message.received}
            senderName={
              nodes.find((node) => node.number === message.message.packet.from)
                ?.user?.longName ?? 'UNK'
            }
          />
        ))}
      </div>
      <MessageBar channelIndex={channelIndex} />
    </div>
  );
};
