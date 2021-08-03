import React from 'react';

import Avatar from 'boring-avatars';

import {
  CheckCircleIcon,
  DotsCircleHorizontalIcon,
} from '@heroicons/react/outline';
import type { Types } from '@meshtastic/meshtasticjs';

import { useAppSelector } from '../hooks/redux';

interface ChatMessageProps {
  message: { message: Types.TextPacket; ack: boolean };
}

export const ChatMessage = (props: ChatMessageProps): JSX.Element => {
  const myId = useAppSelector((state) => state.meshtastic.myId);
  const nodes = useAppSelector((state) => state.meshtastic.nodes);

  const node = nodes.find((node) => {
    node.num === props.message.message.packet.from;
  });

  return (
    <div className="flex items-end">
      <Avatar
        size={40}
        name={node?.user?.longName ?? 'UNK'}
        variant="beam"
        colors={['#213435', '#46685B', '#648A64', '#A6B985', '#E1E3AC']}
      />
      <div className="flex flex-col container px-2 items-start">
        <React.Suspense
          fallback={
            <div className="flex border-b border-gray-300">
              <div className="m-auto p-3 text-gray-500">Loading</div>
            </div>
          }
        >
          <div
            className={`px-4 py-2 rounded-md shadow-md ${
              props.message.message.packet.from !== myId
                ? 'bg-gray-300'
                : 'bg-green-200'
            }`}
          >
            <div className="flex text-xs text-gray-500 space-x-1">
              <div className="font-medium">{node?.user?.longName ?? 'UNK'}</div>
              <p>-</p>
              <div className="underline">
                {new Date(
                  props.message.message.packet.rxTime > 0
                    ? props.message.message.packet.rxTime
                    : Date.now(),
                ).toLocaleString()}
              </div>
            </div>
            <div className="flex justify-between text-gray-600">
              <span className="inline-block">{props.message.message.data}</span>
              {props.message.ack ? (
                <CheckCircleIcon className="my-auto w-5 h-5" />
              ) : (
                <DotsCircleHorizontalIcon className="my-auto animate-pulse w-5 h-5" />
              )}
            </div>
          </div>
        </React.Suspense>
      </div>
    </div>
  );
};
