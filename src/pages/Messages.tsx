import React from 'react';

import { HashtagIcon, MapIcon, UsersIcon } from '@heroicons/react/outline';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { Message } from '../components/chat/Message';
import { MessageBar } from '../components/chat/MessageBar';
import { Button } from '../components/generic/Button';
import { useAppSelector } from '../hooks/redux';

export const Messages = (): JSX.Element => {
  const messages = useAppSelector((state) => state.meshtastic.messages);
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const channels = useAppSelector((state) => state.meshtastic.channels);

  const channelName = () => {
    const name =
      channels.find((channel) => channel.role === Protobuf.Channel_Role.PRIMARY)
        ?.settings?.name ?? 'Unknown';

    return name.length ? name : 'Default';
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between w-full border-b dark:border-gray-600 dark:text-gray-300 px-2">
        <div className="flex my-auto text-sm">
          <HashtagIcon className="h-4 w-4 my-auto" />
          {channelName()}
        </div>
        <div className="flex">
          <Button>
            <MapIcon className="w-6 h-6" />
          </Button>
          <Button>
            <UsersIcon className="w-6 h-6" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col p-6 sm:py-8 sm:px-10 border-b dark:border-gray-600 bg-white dark:bg-secondaryDark flex-grow overflow-y-auto space-y-2">
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
<Button>
  <UsersIcon className="w-6 h-6" />
</Button>;
