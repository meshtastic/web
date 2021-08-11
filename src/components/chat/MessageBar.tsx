import React from 'react';

import { useTranslation } from 'react-i18next';

import {
  EmojiHappyIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
} from '@heroicons/react/outline';

import { connection } from '../../core/connection';
import { useAppSelector } from '../../hooks/redux';
import { IconButton } from '../generic/IconButton';

export const MessageBar = (): JSX.Element => {
  const ready = useAppSelector((state) => state.meshtastic.ready);
  const [currentMessage, setCurrentMessage] = React.useState('');
  const sendMessage = () => {
    if (ready) {
      connection.sendText(currentMessage, undefined, true);
      setCurrentMessage('');
    }
  };
  const { t } = useTranslation();
  return (
    <div className="flex p-4 bg-gray-50 dark:bg-transparent space-x-2 text-gray-500 dark:text-gray-400">
      <div className="flex">
        <IconButton>
          <EmojiHappyIcon className="w-6 h-6" />
        </IconButton>

        <IconButton>
          <PaperClipIcon className="w-6 h-6" />
        </IconButton>
      </div>
      <form
        className="flex w-full space-x-2"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          type="text"
          minLength={2}
          placeholder={`${t('placeholder.message')}...`}
          disabled={!ready}
          value={currentMessage}
          onChange={(e) => {
            setCurrentMessage(e.target.value);
          }}
          className="focus:outline-none h-10 w-full resize-none rounded-full border border-gray-300 dark:bg-gray-900 px-4"
        />
        <IconButton type="submit">
          <PaperAirplaneIcon className="w-6 h-6 rotate-90" />
        </IconButton>
      </form>
    </div>
  );
};
