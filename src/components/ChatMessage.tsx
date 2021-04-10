import React from 'react';

import { FaCheckCircle, FaCircle, FaUser } from 'react-icons/fa';

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
        <FaUser className="m-auto" />
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
              <FaCheckCircle className="my-auto" />
            ) : (
              <FaCircle className=" text-lg my-auto animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
