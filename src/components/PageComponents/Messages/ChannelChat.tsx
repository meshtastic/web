import {
  type MessageWithState,
  useDevice,
} from "@app/core/stores/deviceStore.ts";
import { Message } from "@components/PageComponents/Messages/Message.tsx";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput.tsx";
import type { Types } from "@meshtastic/js";
import { InboxIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import type { JSX } from "react";

export interface ChannelChatProps {
  messages?: MessageWithState[];
  channel: Types.ChannelNumber;
  to: Types.Destination;
}

const EmptyState = () => (
  <div className="flex flex-col place-content-center place-items-center p-8 text-white">
    <InboxIcon className="h-8 w-8 mb-2" />
    <span className="text-sm">No Messages</span>
  </div>
);

export const ChannelChat = ({
  messages,
  channel,
  to,
}: ChannelChatProps): JSX.Element => {
  const { nodes } = useDevice();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      const isNearBottom =
        scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight <
        100;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  if (!messages?.length) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
        <div className="flex-shrink-0 p-4 w-full bg-gray-900">
          <MessageInput to={to} channel={channel} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-scroll w-full" ref={scrollContainerRef}>
        <div className="w-full h-full flex flex-col justify-end">
          {messages.map((message, index) => (
            <Message
              key={message.id}
              message={message}
              lastMsgSameUser={
                index > 0 && messages[index - 1].from === message.from
              }
              sender={nodes.get(message.from)}
            />
          ))}
          <div ref={messagesEndRef} className="w-full" />
        </div>
      </div>
      <div className="flex-shrink-0 mt-2 p-4 w-full bg-gray-900">
        <MessageInput to={to} channel={channel} maxBytes={200} />
      </div>
    </div>
  );
};
