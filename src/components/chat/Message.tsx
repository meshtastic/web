import React from 'react';

import Avatar from 'boring-avatars';

export interface MessageProps {
  message: string;
  ack: boolean;
  isSender: boolean;
  rxTime: Date;
  senderName: string;
}

export const Message = ({
  message,
  ack,
  isSender,
  rxTime,
  senderName,
}: MessageProps): JSX.Element => {
  return (
    <div
      className={`flex space-x-2 ${
        !isSender ? 'ml-auto flex-row-reverse' : ''
      }`}
    >
      <div
        className={`shadow-md rounded-full mt-auto ${!isSender ? 'ml-2' : ''}`}
      >
        <Avatar
          size={30}
          name={senderName ?? 'UNK'}
          variant="beam"
          colors={['#213435', '#46685B', '#648A64', '#A6B985', '#E1E3AC']}
        />
      </div>
      <div>
        <div
          className={`relative max-w-3/4 px-3 py-2 rounded-t-lg ${
            isSender
              ? 'bg-gray-500 text-gray-50 rounded-br-lg'
              : 'bg-primary text-blue-50 rounded-bl-lg'
          } ${ack ? 'animate-none' : 'animate-pulse'}`}
        >
          <div className="leading-5 min-w-4">{message}</div>
        </div>
        <div className="text-xs text-gray-600">{senderName}</div>
      </div>
      <div className="mt-auto mb-4 mr-3 text-xs font-medium text-secondary dark:text-gray-200">
        {rxTime.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
};
