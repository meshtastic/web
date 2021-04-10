import React, { useState } from 'react';

import { FaBars, FaPaperPlane } from 'react-icons/fa';

import type {
  IHTTPConnection,
  Protobuf,
  Types,
} from '@meshtastic/meshtasticjs';

import type { LanguageEnum, languageTemplate } from './App';
import ChatMessage from './components/ChatMessage';
import Sidebar from './components/Sidebar';

interface MainProps {
  Messages: { message: Types.TextPacket; ack: boolean }[];
  Connection: IHTTPConnection;
  MyNodeInfo: Protobuf.MyNodeInfo;
  Nodes: Types.NodeInfoPacket[];
  Channels: Protobuf.Channel[];
  IsReady: boolean;
  Preferences: Protobuf.RadioConfig_UserPreferences;
  Language: LanguageEnum;
  SetLanguage: Function;
  Translations: languageTemplate;
}

const Main = (props: MainProps) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(true);

  const sendMessage = () => {
    if (props.IsReady) {
      props.Connection.sendText(currentMessage, undefined, true);
      setCurrentMessage('');
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-grow space-2">
      <div className="flex flex-col flex-grow container mx-auto">
        <div className="flex flex-col flex-grow py-6 px-3 space-y-2">
          {props.Messages.length ? (
            props.Messages.map((message, Main) => (
              <ChatMessage
                nodes={props.Nodes}
                key={Main}
                message={message}
                myId={props.MyNodeInfo.myNodeNum}
              />
            ))
          ) : (
            <div className="m-auto text-2xl text-gray-500">
              {props.Translations.no_messages_message}
            </div>
          )}
        </div>
        <div className="flex space-x-2 w-full p-3">
          <form
            className="flex flex-wrap relative w-full"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            {props.IsReady}
            <input
              type="text"
              placeholder={`${props.Translations.no_message_placeholder}...`}
              disabled={!props.IsReady}
              value={currentMessage}
              onChange={(e) => {
                setCurrentMessage(e.target.value);
              }}
              className={`p-3 placeholder-gray-400 text-gray-700 relative rounded-md shadow-md focus:outline-none w-full pr-10 ${
                props.IsReady ? 'cursor-text' : 'cursor-not-allowed'
              }`}
            />
            <span className="z-10 h-full text-gray-400 absolute w-8 right-0 py-4">
              <FaPaperPlane
                onClick={sendMessage}
                className={`text-xl hover:text-gray-500  ${
                  props.IsReady ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              />
            </span>
          </form>
          <div
            className="flex p-3 text-xl hover:text-gray-500 text-gray-400 rounded-md shadow-md focus:outline-none cursor-pointer md:hidden"
            onClick={() => {
              setMobileNavOpen(!mobileNavOpen);
            }}
          >
            <FaBars className="m-auto" />
          </div>
        </div>
      </div>
      <Sidebar
        IsReady={props.IsReady}
        Nodes={props.Nodes}
        Channels={props.Channels}
        Preferences={props.Preferences}
        Connection={props.Connection}
        MobileNavOpen={mobileNavOpen}
        Language={props.Language}
        SetLanguage={props.SetLanguage}
        Translations={props.Translations}
      />
    </div>
  );
};

export default Main;
