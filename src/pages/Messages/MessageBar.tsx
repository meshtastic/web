import type React from 'react';
import { useState } from 'react';

import { Input } from '@components/generic/form/Input';
import { connection } from '@core/connection';
import { ackMessage } from '@core/slices/meshtasticSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';

export interface MessageBarProps {
  chatIndex: number;
}

export const MessageBar = ({ chatIndex }: MessageBarProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const meshtasticState = useAppSelector((state) => state.meshtastic);

  const [isChannel, setIsChannel] = useState(false);

  useState(() => {
    setIsChannel(
      meshtasticState.radio.channels.findIndex(
        (channel) => channel.index === chatIndex,
      ) !== -1,
    );
  });

  const [currentMessage, setCurrentMessage] = useState('');
  const sendMessage = (): void => {
    if (meshtasticState.ready) {
      void connection.sendText(
        currentMessage,
        isChannel ? undefined : chatIndex,
        true,
        isChannel ? chatIndex-- : 0,
        (id) => {
          console.log(`Chat Index, ${chatIndex}`);
          console.log(`Chat Index --, ${chatIndex--}`);

          console.log(
            `Chat Index computed, ${isChannel ? chatIndex-- : chatIndex}`,
          );

          dispatch(
            ackMessage({
              chatIndex: isChannel ? chatIndex-- : chatIndex,
              messageId: id,
            }),
          );

          return Promise.resolve();
        },
      );
      setCurrentMessage('');
    }
  };
  return (
    <div className="mx-auto flex w-full space-x-2 bg-gray-50 bg-transparent p-3 text-gray-500 dark:text-gray-400">
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
            disabled={!meshtasticState.ready}
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
