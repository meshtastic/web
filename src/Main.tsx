import React, { useState } from 'react';

import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Protobuf,
  Types,
} from '@meshtastic/meshtasticjs';

import ChatMessage from './components/ChatMessage';
import MessageBox from './components/MessageBox';
import Sidebar from './components/Sidebar';
import { useTranslationsContextValue } from './hooks/useTranslationsContextValue';
import { TranslationsContext } from './translations/TranslationsContext';

interface MainProps {
  connection: ISerialConnection | IHTTPConnection | IBLEConnection;
  myNodeInfo: Protobuf.MyNodeInfo;
  isReady: boolean;
  darkmode: boolean;
  setDarkmode: React.Dispatch<React.SetStateAction<boolean>>;
}

const Main = (props: MainProps): JSX.Element => {
  const translationsContextValue = useTranslationsContextValue();
  const { translations } = React.useContext(TranslationsContext);

  const [messages, setMessages] = React.useState<
    { message: Types.TextPacket; ack: boolean }[]
  >([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  React.useEffect(() => {
    const textPacketEvent = props.connection.onTextPacketEvent.subscribe(
      (message) => {
        setMessages((messages) => [
          ...messages,
          { message: message, ack: false },
        ]);
      },
    );
    return () => textPacketEvent?.unsubscribe();
  }, [props.connection]);

  React.useEffect(() => {
    const routingPacketEvent = props.connection.onRoutingPacketEvent.subscribe(
      (routingPacket) => {
        setMessages(
          messages.map((message) => {
            return routingPacket.packet.payloadVariant.oneofKind ===
              'decoded' &&
              message.message.packet.id ===
                routingPacket.packet.payloadVariant.decoded.requestId
              ? {
                  ack: true,
                  message: message.message,
                }
              : message;
          }),
        );
      },
    );
    return () => routingPacketEvent?.unsubscribe();
  }, [props.connection, messages]);

  return (
    <TranslationsContext.Provider value={translationsContextValue}>
      <div className="flex flex-col md:flex-row flex-grow m-3 space-y-2 md:space-y-0 space-x-0 md:space-x-2">
        <div className="flex flex-col flex-grow container mx-auto">
          <div className="flex flex-col flex-grow py-6 space-y-2">
            {messages.length ? (
              messages.map((message, Main) => (
                <ChatMessage
                  key={Main}
                  message={message}
                  myId={props.myNodeInfo.myNodeNum}
                />
              ))
            ) : (
              <div className="m-auto text-2xl text-gray-500">
                {translations.no_messages_message}
              </div>
            )}
          </div>
          <MessageBox
            connection={props.connection}
            isReady={props.isReady}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
        <Sidebar
          myId={props.myNodeInfo.myNodeNum}
          sidebarOpen={sidebarOpen}
          darkmode={props.darkmode}
          setDarkmode={props.setDarkmode}
          connection={props.connection}
        />
      </div>
    </TranslationsContext.Provider>
  );
};

export default Main;
