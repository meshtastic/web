import type React from "react";
import { ChangeEvent, useState } from "react";

import { Input } from "@app/components/form/Input.js";
import { IconButton } from "@app/components/IconButton.js";
import { Message } from "@components/PageComponents/Messages/Message.js";
import { useDevice } from "@core/providers/useDevice.js";
import type { Channel } from "@core/stores/deviceStore.js";
import { MapPinIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

export interface ChannelChatProps {
  channel: Channel;
}

export const ChannelChat = ({ channel }: ChannelChatProps): JSX.Element => {
  const { nodes, connection, ackMessage } = useDevice();
  const [currentMessage, setCurrentMessage] = useState("");

  const sendMessage = (): void => {
    void connection?.sendText(
      currentMessage,
      undefined,
      true,
      channel.config.index,
      (id) => {
        ackMessage(channel.config.index, id);
        return Promise.resolve();
      }
    );
    setCurrentMessage("");
  };

  return (
    <div className="flex flex-col flex-grow">
      <div className="flex flex-col flex-grow">
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
      <div className="flex gap-2">
        <form
          className="w-full"
          onSubmit={(e): void => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <div className="flex flex-grow gap-2">
            <span className="w-full">
              <Input
                minLength={2}
                label=""
                placeholder="Enter Message"
                value={currentMessage}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                  setCurrentMessage(e.target.value);
                }}
              />
            </span>
            <IconButton
              variant="secondary"
              icon={<PaperAirplaneIcon className="h-4 text-slate-500" />}
            />
          </div>
        </form>
        <IconButton
          variant="secondary"
          icon={<MapPinIcon className="h-4 text-slate-500" />}
        />
      </div>
    </div>
  );
};
