import React from 'react';

import { Message } from '../components/chat/Message';
import { MessageBar } from '../components/chat/MessageBar';
import { useAppSelector } from '../hooks/redux';

export const Messages = (): JSX.Element => {
  const messages = useAppSelector((state) => state.meshtastic.messages);
  const nodes = useAppSelector((state) => state.meshtastic.nodes);

  return (
    <div className="flex flex-col w-full">
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
