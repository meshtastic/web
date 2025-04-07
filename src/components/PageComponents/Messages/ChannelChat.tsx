import { MessageItem } from "@components/PageComponents/Messages/MessageItem.tsx";
import type { Message as MessageType } from "@core/stores/messageStore.ts";
import { InboxIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface ChannelChatProps {
  messages?: MessageType[];
}

const EmptyState = () => (
  <div className="flex flex-col place-content-center place-items-center p-8 text-gray-500 dark:text-gray-400">
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
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-4"
      >
        <div className="flex flex-col justify-end min-h-full space-y-4">
          {messages?.map((message) => {
            return (
              <MessageItem
                key={message?.messageId}
                message={message}
              />
            );
          })}
          <div ref={messagesEndRef} className="h-0 w-full" />
        </div>
      </div>
    </div>
  );
};