import type React from "react";

import { Message } from "@components/PageComponents/Messages/Message.js";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.js";
import { useDevice } from "@core/providers/useDevice.js";
import type { Channel } from "@core/stores/deviceStore.js";

export interface ChannelChatProps {
  channel: Channel;
}

export const ChannelChat = ({ channel }: ChannelChatProps): JSX.Element => {
  const { nodes, connection, ackMessage } = useDevice();

  return (
    <div className="flex flex-grow flex-col">
      <div className="flex flex-grow flex-col">
        {channel.messages.map((message, index) => (
          <Message
            key={index}
            message={message}
            lastMsgSameUser={
              index === 0
                ? false
                : channel.messages[index - 1].packet.from ===
                  message.packet.from
            }
            sender={
              nodes.find((node) => node.data.num === message.packet.from)?.data
            }
          />
        ))}
      </div>
      <MessageInput channel={channel} />
    </div>
  );
};
