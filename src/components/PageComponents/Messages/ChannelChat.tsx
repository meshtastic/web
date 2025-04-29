import { MessageItem } from "@components/PageComponents/Messages/MessageItem.tsx";
import type { Message as MessageType } from "@core/stores/messageStore.ts";
import { InboxIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface ChannelChatProps {
  messages?: MessageType[];
}

const EmptyState = () => (
  <div className="flex flex-1 flex-col place-content-center place-items-center p-8 text-slate-500 dark:text-slate-400">
    <InboxIcon className="mb-2 h-8 w-8" />
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

    const scrollThreshold = 50; // How close to bottom to trigger smooth scroll
    const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < scrollThreshold;

    if (behavior === 'instant' || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages, scrollToBottom]);


  if (!messages?.length) {
    return (
      <ul ref={scrollContainerRef} className="flex flex-1 flex-col items-center justify-center">
        <EmptyState />
        <div ref={messagesEndRef} />
      </ul>
    );
  }


  return (
    <ul
      ref={scrollContainerRef}
      className="mt-auto overflow-y-auto px-3 py-2"
    >
      <div ref={messagesEndRef} className="h-px" />
      {messages?.map((message) => {
        return (
          <MessageItem
            key={message?.messageId ?? `${message?.from}-${message?.date}`}
            message={message}
          />
        );
      })}
    </ul>
  );
};