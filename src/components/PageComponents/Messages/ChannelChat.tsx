import { MessageItem } from "@components/PageComponents/Messages/MessageItem.tsx";
import { InboxIcon } from "lucide-react";
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
  if (!messages?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <EmptyState />
      </div>
    );
  }

  return (
    <ul className="flex flex-col-reverse flex-grow overflow-y-auto px-3 py-2 ">
      {messages?.map((message) => (
        <MessageItem
          key={message.messageId ?? `${message.from}-${message.date}`}
          message={message}
        />
      ))}
    </ul>
  );
};
