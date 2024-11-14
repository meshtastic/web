import { Subtle } from "@app/components/UI/Typography/Subtle.tsx";
import { useDevice } from "@app/core/stores/deviceStore.ts";
import { MessageStore } from "@app/core/stores/messageStore.ts";
import { Message } from "@components/PageComponents/Messages/Message.tsx";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.tsx";
import { TraceRoute } from "@components/PageComponents/Messages/TraceRoute.tsx";
import type { Protobuf, Types } from "@meshtastic/js";
import { InboxIcon } from "lucide-react";
import { useState, useEffect, useRef } from 'react';

export interface ChannelChatProps {
  messageStore: MessageStore;
  channel: Types.ChannelNumber;
  to: Types.Destination;
  traceroutes?: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>[];
}

export const ChannelChat = ({
  messageStore,
  channel,
  to,
  traceroutes,
}: ChannelChatProps): JSX.Element => {
  const { nodes } = useDevice();
  const messages = messageStore.messages;

  return (
    <div className="flex flex-grow flex-col">
      <div className="flex flex-grow">
        <div className="flex flex-grow flex-col">
          {messages ? (
            messages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                lastMsgSameUser={
                  index === 0
                    ? false
                    : messages[index - 1].from === message.from
                }
                sender={nodes.get(message.from)}
              />
            ))
          ) : (
            <div className="m-auto">
              <InboxIcon className="m-auto" />
              <Subtle>No Messages</Subtle>
            </div>
          )}
        </div>
        <div
          className={`flex flex-grow flex-col border-slate-400 border-l ${traceroutes === undefined ? "hidden" : ""}`}
        >
          {to === "broadcast" ? null : traceroutes ? (
            traceroutes.map((traceroute, index) => (
              <TraceRoute
                key={traceroute.id}
                from={nodes.get(traceroute.from)}
                to={nodes.get(traceroute.to)}
                route={traceroute.data.route}
              />
            ))
          ) : (
            <div className="m-auto">
              <InboxIcon className="m-auto" />
              <Subtle>No Traceroutes</Subtle>
            </div>
          )}
        </div>
      </div>
      <div className="pl-3 pr-3 pt-3 pb-1">
        <MessageInput to={to} channel={channel} />
      </div>
    </div>
  );
};
