import React from 'react';

import { Message } from '@components/chat/Message';
import { MessageBar } from '@components/chat/MessageBar';
import { Button } from '@components/generic/Button';
import { HashtagIcon, MapIcon, UsersIcon } from '@heroicons/react/outline';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { useAppSelector } from '../hooks/redux';

export const Messages = (): JSX.Element => {
  const messages = useAppSelector((state) => state.meshtastic.messages);
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const channels = useAppSelector((state) => state.meshtastic.channels);

  const channelName = (): string => {
    const name =
      channels.find((channel) => channel.role === Protobuf.Channel_Role.PRIMARY)
        ?.settings?.name ?? 'Unknown';

    return name.length ? name : 'Default';
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between w-full px-2 border-b dark:border-gray-600 dark:text-gray-300">
        <div className="flex my-auto text-sm">
          <HashtagIcon className="w-4 h-4 my-auto" />
          {channelName()}
        </div>
        <div className="flex">
          <Button icon={<MapIcon className="w-5 h-5" />} circle />

          <Button icon={<UsersIcon className="w-5 h-5" />} circle />
        </div>
      </div>
      <div className="flex flex-col flex-grow p-6 space-y-2 overflow-y-auto bg-white border-b md:py-8 md:px-10 dark:border-gray-600 dark:bg-secondaryDark">
        {messages.map((message, index) => (
          <Message
            key={index}
            isSender={message.isSender}
            message={message.message.data}
            ack={message.ack}
            rxTime={new Date()}
            senderName={
              nodes.find((node) => node.num === message.message.packet.from)
                ?.user?.longName ?? 'UNK'
            }
          />
        ))}
      </div>
      <MessageBar />
    </div>
  );
};
