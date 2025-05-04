import { MessageItem } from "@components/PageComponents/Messages/MessageItem.tsx";
import { InboxIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Message } from "@core/stores/messageStore/types.ts";

export interface ChannelChatProps {
  messages?: Message[];
}

const EmptyState = () => (
  <div className="flex flex-1 flex-col place-content-center place-items-center p-8 text-slate-500 dark:text-slate-400">
    <InboxIcon className="mb-2 h-8 w-8" />
    <span className="text-sm">No Messages</span>
  </div>
);

export const ChannelChat = ({ messages = [] }: ChannelChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLUListElement>(null);
  const userScrolledUpRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const isScrolledToBottom =
      scrollContainer.scrollHeight - scrollContainer.scrollTop -
          scrollContainer.clientHeight <= 10;

    if (isScrolledToBottom || !userScrolledUpRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = () => {
      if (!scrollContainer) return;
      const isAtBottom =
        scrollContainer.scrollHeight - scrollContainer.scrollTop -
            scrollContainer.clientHeight <= 10;
      userScrolledUpRef.current = !isAtBottom;
    };
    scrollContainer?.addEventListener("scroll", handleScroll, {
      passive: true,
    });
    return () => {
      scrollContainer?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!messages?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <EmptyState />
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <ul
      ref={scrollContainerRef}
      className="flex flex-col flex-grow overflow-y-auto px-3 py-2"
    >
      <div className="flex-grow" />

      {messages?.map((message) => (
        <MessageItem
          key={message.messageId ?? `${message.from}-${message.date}`}
          message={message}
        />
      ))}

      <div ref={messagesEndRef} className="h-px" />
    </ul>
  );
};
