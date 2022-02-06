import type React from 'react';

import type { Node } from '@app/core/slices/meshtasticSlice';
import { Tooltip } from '@meshtastic/components';
// eslint-disable-next-line import/no-unresolved
import skypack_hashicon from '@skypack/@emeraldpay/hashicon-react';

const Hashicon = skypack_hashicon.Hashicon;

export interface MessageProps {
  lastMsgSameUser: boolean;
  message: string;
  ack: boolean;
  rxTime: Date;
  sender?: Node;
}

export const Message = ({
  lastMsgSameUser,
  message,
  ack,
  rxTime,
  sender,
}: MessageProps): JSX.Element => {
  return (
    <div className="group mb-3 hover:bg-gray-200 dark:hover:bg-primaryDark">
      {lastMsgSameUser ? (
        <div
          className={`mx-6 -mt-3 flex gap-2 ${lastMsgSameUser ? '' : 'py-1'}`}
        >
          <div className="flex">
            <Tooltip content={rxTime.toString()}>
              <div className="my-auto ml-auto w-8 pt-1 text-xs text-transparent dark:group-hover:text-gray-400">
                {rxTime
                  .toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  .replace('AM', '')
                  .replace('PM', '')}
              </div>
            </Tooltip>
          </div>
          <div
            className={`my-auto dark:text-gray-300 ${
              ack ? '' : 'animate-pulse dark:text-gray-500'
            }`}
          >
            {message}
          </div>
        </div>
      ) : (
        <div className="mx-6 flex gap-2">
          <div className="my-auto w-8">
            <Hashicon value={(sender?.number ?? 0).toString()} size={32} />
          </div>
          <div>
            <div className="flex gap-2">
              <div className="cursor-default text-sm font-semibold hover:underline dark:text-white">
                {sender?.user?.longName ?? 'UNK'}
              </div>
              <div className="my-auto text-xs dark:text-gray-400">
                {rxTime.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <div
              className={`dark:text-gray-300 ${
                ack ? '' : 'animate-pulse dark:text-gray-400'
              }`}
            >
              {message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
