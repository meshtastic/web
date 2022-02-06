import React from 'react';

import { connection } from '@core/connection';
import { ackMessage } from '@core/slices/meshtasticSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Input } from '@meshtastic/components';

export interface MessageBarProps {
  channelIndex: number;
}

export const MessageBar = ({ channelIndex }: MessageBarProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const ready = useAppSelector((state) => state.meshtastic.ready);

  const [currentMessage, setCurrentMessage] = React.useState('');
  const sendMessage = (): void => {
    if (ready) {
      void connection.sendText(
        currentMessage,
        undefined,
        true,
        channelIndex--,
        (id) => {
          dispatch(ackMessage({ channel: channelIndex--, messageId: id }));

          return Promise.resolve();
        },
      );
      setCurrentMessage('');
    }
  };
  return (
    <div className="mx-auto flex w-full space-x-2 bg-gray-50 p-4 text-gray-500 dark:bg-transparent dark:text-gray-400">
      <div className="mx-auto flex w-full max-w-4xl">
        <form
          className="flex w-full space-x-2"
          onSubmit={(e): void => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            type="text"
            minLength={2}
            placeholder="Enter Message"
            disabled={!ready}
            value={currentMessage}
            onChange={(e): void => {
              setCurrentMessage(e.target.value);
            }}
          />
        </form>
      </div>
    </div>
  );
};
