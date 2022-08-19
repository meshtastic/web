import type React from "react";
import { ChangeEvent, useState } from "react";

import {
  AddLocationIcon,
  IconButton,
  majorScale,
  Pane,
  Popover,
  SendMessageIcon,
  TextInputField,
  Tooltip,
} from "evergreen-ui";

import { useDevice } from "@core/providers/useDevice.js";
import type { Channel } from "@core/stores/deviceStore.js";

import { Message } from "./Message.js";
import { NewLocationMessage } from "./NewLocationMessage.js";

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
    <Pane display="flex" flexDirection="column" flexGrow={1}>
      <Pane display="flex" flexDirection="column" flexGrow={1}>
        {channel.messages.map((message, index) => (
          <Message
            key={index}
            messagePacket={message.message}
            ack={message.ack}
            rxTime={message.received}
            lastMsgSameUser={
              index === 0
                ? false
                : channel.messages[index - 1].message.packet.from ===
                  message.message.packet.from
            }
            sender={
              nodes.find(
                (node) => node.data.num === message.message.packet.from
              )?.data
            }
          />
        ))}
      </Pane>
      <Pane display="flex" gap={majorScale(1)}>
        <form
          style={{ display: "flex", flexGrow: 1 }}
          onSubmit={(e): void => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Pane display="flex" flexGrow={1} gap={majorScale(1)}>
            <TextInputField
              marginTop="auto"
              minLength={2}
              width="100%"
              label=""
              placeholder="Enter Message"
              marginBottom={0}
              value={currentMessage}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                setCurrentMessage(e.target.value);
              }}
            />
            <Tooltip content="Send">
              <IconButton
                icon={SendMessageIcon}
                marginTop={majorScale(2)}
                width={majorScale(8)}
              />
            </Tooltip>
          </Pane>
        </form>
        <Tooltip content="Send Location">
          <Popover content={<NewLocationMessage />}>
            <IconButton
              icon={AddLocationIcon}
              marginTop={majorScale(2)}
              width={majorScale(8)}
            />
          </Popover>
        </Tooltip>
      </Pane>
    </Pane>
  );
};
