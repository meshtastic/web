import { Subtle } from "@app/components/UI/Typography/Subtle.js";
import { MessageWithState, useDevice } from "@app/core/stores/deviceStore.js";
import { Message } from "@components/PageComponents/Messages/Message.js";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.js";
import type { Types } from "@meshtastic/js";
import { InboxIcon } from "lucide-react";

export interface ChannelChatProps {
  messages?: MessageWithState[];
  channel: Types.ChannelNumber;
  to: Types.Destination;
}

export const ChannelChat = ({
  messages,
  channel,
  to,
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
      </div>
      <div className="p-3">
        <MessageInput to={to} channel={channel} />
      </div>
    </div>
  );
};
