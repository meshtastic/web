import type React from "react";
import { ChangeEvent, useState } from "react";

import {
  IconButton,
  majorScale,
  Pane,
  SendMessageIcon,
  TextInputField,
  Tooltip,
} from "evergreen-ui";

import type { Channel } from "@core/stores/deviceStore.js";
import { useDevice } from "@core/stores/deviceStore.js";

import { Message } from "./Message.js";

export interface ChannelChatProps {
  channel: Channel;
}

export const ChannelChat = ({ channel }: ChannelChatProps): JSX.Element => {
  const { nodes, connection } = useDevice();
  const [currentMessage, setCurrentMessage] = useState("");

  const sendMessage = (): void => {
    console.log("SENDING TEXT");

    void connection?.sendText(
      currentMessage,
      undefined,
      true,
      channel.config.index, //maybe channel.config.index--
      (id) => {
        // console.log(`Chat Index, ${chatIndex}`);
        // console.log(`Chat Index --, ${chatIndex--}`);

        // console.log(
        //   `Chat Index computed, ${isChannel ? chatIndex-- : chatIndex}`,
        // );

        // dispatch(
        //   ackMessage({
        //     chatIndex: channel.config.index,
        //     messageId: id,
        //   }),
        // );

        console.log("Message Sent");

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
            message={message.message.data}
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
      <form
        onSubmit={(e): void => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <Pane display="flex" gap={majorScale(1)}>
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
    </Pane>
  );
};
