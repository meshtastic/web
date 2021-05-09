import React from 'react';

import { MenuIcon, PaperAirplaneIcon } from '@heroicons/react/outline';
import type { IHTTPConnection } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../App';

export interface MessageBoxProps {
  translations: languageTemplate;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  connection: IHTTPConnection;
  isReady: boolean;
}

const MessageBox = (props: MessageBoxProps) => {
  const [currentMessage, setCurrentMessage] = React.useState('');
  const sendMessage = () => {
    if (props.isReady) {
      props.connection.sendText(currentMessage, undefined, true);
      setCurrentMessage('');
    }
  };
  return (
    <div className="flex text-lg font-medium space-x-2 md:space-x-0 w-full">
      <div
        className="flex p-3 text-xl hover:text-gray-500 text-gray-400 rounded-md border shadow-md focus:outline-none cursor-pointer md:hidden"
        onClick={() => {
          props.setSidebarOpen(!props.sidebarOpen);
        }}
      >
        <MenuIcon className="m-auto h-6 2-6" />
      </div>
      <form
        className="flex flex-wrap relative w-full"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        {props.isReady}
        <input
          type="text"
          placeholder={`${props.translations.no_message_placeholder}...`}
          disabled={!props.isReady}
          value={currentMessage}
          onChange={(e) => {
            setCurrentMessage(e.target.value);
          }}
          className={`p-3 placeholder-gray-400 text-gray-700 relative rounded-md border shadow-md focus:outline-none w-full pr-10 ${
            props.isReady ? 'cursor-text' : 'cursor-not-allowed'
          }`}
        />
        <span className="flex z-10 h-full text-gray-400 absolute w-8 right-0">
          <PaperAirplaneIcon
            onClick={sendMessage}
            className={`text-xl hover:text-gray-500 h-6 w-6 my-auto ${
              props.isReady ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
          />
        </span>
      </form>
    </div>
  );
};

export default MessageBox;
