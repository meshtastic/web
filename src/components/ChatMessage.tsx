import React from 'react';

import {
  CheckCircleIcon,
  DotsCircleHorizontalIcon,
  UserIcon,
} from '@heroicons/react/outline';
import type { Types } from '@meshtastic/meshtasticjs';

interface ChatMessageProps {
  message: { message: Types.TextPacket; ack: boolean };
  myId: number;
  nodes: Types.NodeInfoPacket[];
}

const ChatMessage = (props: ChatMessageProps) => {
  return (
    <div className="flex items-end">
      <div
        className={`flex p-3 rounded-full shadow-md ${
          props.message.message.packet.from !== props.myId
            ? 'bg-gray-300'
            : 'bg-green-200'
        }`}
      >
        <UserIcon className="m-auto w-5 h-5" />
      </div>
      <div className="flex flex-col container px-2 items-start">
        <div
          className={`px-4 py-2 rounded-md shadow-md ${
            props.message.message.packet.from !== props.myId
              ? 'bg-gray-300'
              : 'bg-green-200'
          }`}
        >
          <div className="flex text-xs text-gray-500 space-x-1">
            <div className="font-medium">
              {/* {
                props.nodes.find(
                  (node) => node.data.num === props.message.message.packet.from,
                ).data.user.longName
              } */}
            </div>
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
      </div>
    </div>
  );
};

export default ChatMessage;
