import React from 'react';

import { useTranslation } from 'react-i18next';

import { MenuIcon, PaperAirplaneIcon } from '@heroicons/react/outline';

import { connection } from '../connection';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { toggleSidebar } from '../slices/appSlice';

export const MessageBox = (): JSX.Element => {
  const ready = useAppSelector((state) => state.meshtastic.ready);
  const [currentMessage, setCurrentMessage] = React.useState('');
  const sendMessage = () => {
    if (ready) {
      connection.sendText(currentMessage, undefined, true);
      setCurrentMessage('');
    }
  };
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <div className="flex text-lg font-medium space-x-2 md:space-x-0 w-full">
      <div
        className="flex p-3 text-xl hover:text-gray-500 text-gray-400 rounded-md border shadow-md focus:outline-none cursor-pointer md:hidden"
        onClick={() => {
          dispatch(toggleSidebar());
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
        {ready}
        <input
          type="text"
          placeholder={`${t('placeholder.no_messages')}...`}
          disabled={!ready}
          value={currentMessage}
          onChange={(e) => {
            setCurrentMessage(e.target.value);
          }}
          className={`p-3 placeholder-gray-400 text-gray-700 relative rounded-md border shadow-md focus:outline-none w-full pr-10 ${
            ready ? 'cursor-text' : 'cursor-not-allowed'
          }`}
        />
        <span className="flex z-10 h-full text-gray-400 absolute w-8 right-0">
          <PaperAirplaneIcon
            onClick={sendMessage}
            className={`text-xl hover:text-gray-500 h-6 w-6 my-auto ${
              ready ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
          />
        </span>
      </form>
    </div>
  );
};
