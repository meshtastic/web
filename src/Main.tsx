import React from 'react';

import { useTranslation } from 'react-i18next';

import type { Types } from '@meshtastic/meshtasticjs';

import { ChatMessage } from './components/ChatMessage';
import { MessageBox } from './components/MessageBox';
import { Sidebar } from './components/Sidebar';
import { connection } from './connection';

export const Main = (): JSX.Element => {
  const [messages, setMessages] = React.useState<
    { message: Types.TextPacket; ack: boolean }[]
  >([]);
  const { t } = useTranslation();

  React.useEffect(() => {
    connection.onTextPacket.subscribe((message) => {
      setMessages((messages) => [
        ...messages,
        { message: message, ack: false },
      ]);
    });
  }, []);

  React.useEffect(() => {
    connection.onRoutingPacket.subscribe((routingPacket) => {
      setMessages(
        messages.map((message) => {
          return routingPacket.packet.payloadVariant.oneofKind === 'decoded' &&
            message.message.packet.id ===
              routingPacket.packet.payloadVariant.decoded.requestId
            ? {
                ack: true,
                message: message.message,
              }
            : message;
        }),
      );
    });
  }, [messages]);

  return (
    <div className="flex flex-col md:flex-row flex-grow m-3 space-y-2 md:space-y-0 space-x-0 md:space-x-2">
      <div className="flex flex-col flex-grow container mx-auto">
        <div className="flex flex-col flex-grow py-6 space-y-2">
          {messages.length ? (
            messages.map((message, Main) => (
              <ChatMessage key={Main} message={message} />
            ))
          ) : (
            <div className="m-auto text-2xl text-gray-500">
              {t('placeholder.no_messages')}
            </div>
          )}
        </div>
        <MessageBox />
      </div>
      <Sidebar />
    </div>
  );
};
