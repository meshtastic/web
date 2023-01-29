import { Message } from "@components/PageComponents/Messages/Message.js";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.js";
import { useDevice } from "@core/providers/useDevice.js";
import type { Channel } from "@core/stores/deviceStore.js";

export interface ChannelChatProps {
  channel: Channel;
}

export const ChannelChat = ({ channel }: ChannelChatProps): JSX.Element => {
  const { nodes } = useDevice();

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
                : channel.messages[index - 1].from === message.from
            }
            sender={nodes.find((node) => node.data.num === message.from)?.data}
          />
        ))}
      </div>
      <div className="p-3">
        <MessageInput channel={channel} />
      </div>
    </div>
  );
};
