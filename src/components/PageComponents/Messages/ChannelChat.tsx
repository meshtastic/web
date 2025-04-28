import { MessageItem } from "@components/PageComponents/Messages/MessageItem.tsx";
import type { Message as MessageType } from "@core/stores/messageStore.ts";
import { InboxIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface ChannelChatProps {
  messages?: MessageType[];
}

const EmptyState = () => (
  <div className="flex flex-1 flex-col place-content-center place-items-center p-8 text-gray-500 dark:text-gray-400">
    <InboxIcon className="h-8 w-8 mb-2" />
    <span className="text-sm">No Messages</span>
  </div>
);

export const ChannelChat = ({
  messages = [],
}: ChannelChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLUListElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const isNearBottom =
      scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight < 100; // Threshold in pixels

    if (isNearBottom || behavior === 'instant') {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('instant');
  }, [scrollToBottom]);

  if (!messages?.length) {
    return (
      <ul ref={scrollContainerRef} className="flex-1 flex flex-col items-center justify-center">

        <EmptyState />
      </ul>
    );
  }

  return (
    <ul
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto px-3 py-2"
    >
      {messages?.map((message) => {
        return (
          <MessageItem
            key={message?.messageId ?? `${message?.from}-${message?.date}`}
            message={message}
          />
        );
      })}
      <div ref={messagesEndRef} className="h-px" />
    </ul>
  );
};