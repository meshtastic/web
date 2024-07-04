import { Subtle } from "@app/components/UI/Typography/Subtle.js";
import {
  type MessageWithState,
  useDevice,
} from "@app/core/stores/deviceStore.js";
import { Message } from "@components/PageComponents/Messages/Message.js";
import { TraceRoute } from "@components/PageComponents/Messages/TraceRoute.js";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.js";
import type { Protobuf, Types } from "@meshtastic/js";
import { InboxIcon } from "lucide-react";

export interface ChannelChatProps {
  messages?: MessageWithState[];
  channel: Types.ChannelNumber;
  to: Types.Destination;
  traceroutes?: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>[];
}

export const ChannelChat = ({
  messages,
  channel,
  to,
  traceroutes,
}: ChannelChatProps): JSX.Element => {
  const { nodes } = useDevice();

  return (
    <div className="flex flex-grow flex-col">
      <div className="flex flex-grow flex-col">
        {messages ? (
          messages.map((message, index) => (
            <Message
              key={message.id}
              message={message}
              lastMsgSameUser={
                index === 0 ? false : messages[index - 1].from === message.from
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
        { to === "broadcast" ? null : traceroutes ? (
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
      <div className="p-3">
        <MessageInput to={to} channel={channel} />
      </div>
    </div>
  );
};
