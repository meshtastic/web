import { MessageItem } from "@components/PageComponents/Messages/MessageItem.tsx";
import type { Message as Message } from "@core/stores/messageStore.ts";
import { InboxIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface ChannelChatProps {
  messages?: Message[];
}

const EmptyState = () => (
  <div className="flex flex-col place-content-center place-items-center p-8 text-white">
    <InboxIcon className="h-8 w-8 mb-2" />
    <span className="text-sm">No Messages</span>
  </div>
);

export const ChannelChat = ({
  messages = [],
}: ChannelChatProps) => {
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
  }, [scrollToBottom, messages]);

  if (!messages?.length) {
    return (
      <div className="flex flex-col h-full container mx-auto">
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full container mx-auto">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pl-4 pr-4 md:pr-44"
      >
        <div className="flex flex-col justify-end min-h-full">
          {messages?.map((message, index) => (
            <MessageItem
              key={message.messageId + index}
              message={message}
              lastMsgSameUser={
                index > 0 &&
                messages[index - 1].from === message.from
              }
            />
          ))}
          <div ref={messagesEndRef} className="w-full" />
        </div>
      </div>

    </div>
  );
};