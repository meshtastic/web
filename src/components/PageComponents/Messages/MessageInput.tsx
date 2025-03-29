import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Types } from "@meshtastic/core";
import { SendIcon } from "lucide-react";
import { startTransition, useCallback, useMemo, useState } from "react";
import { ChatTypes, useMessageStore } from "@core/stores/messageStore.ts";
import { debounce } from "@core/utils/debounce.ts";

export interface MessageInputProps {
  to: Types.Destination;
  channel: Types.ChannelNumber;
  maxBytes: number;
}

export const MessageInput = ({
  to,
  channel,
  maxBytes,
}: MessageInputProps) => {
  const { connection } = useDevice();
  const { setMessageState, activeChat, setDraft, getDraft, clearDraft } = useMessageStore();

  const [localDraft, setLocalDraft] = useState(getDraft(to));
  const [messageBytes, setMessageBytes] = useState(0);

  const debouncedSetMessageDraft = useMemo(
    () => debounce((value: string) => setDraft(to, value), 300),
    [setDraft, to]
  );

  const calculateBytes = (text: string) => new Blob([text]).size;

  const chatType = to === 'broadcast' ? ChatTypes.BROADCAST : ChatTypes.DIRECT;

  const sendText = useCallback(async (message: string) => {
    try {
      const messageId = await connection?.sendText(message, to, true, channel);
      if (messageId !== undefined) {
        setMessageState({ type: chatType, key: activeChat, messageId, newState: 'ack' });
      }
      // deno-lint-ignore no-explicit-any
    } catch (e: any) {
      setMessageState({
        type: chatType,
        key: activeChat,
        messageId: e?.id,
        newState: 'failed',
      });
    }
  }, [channel, connection, setMessageState, to, activeChat, chatType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const byteLength = calculateBytes(newValue);

    if (byteLength <= maxBytes) {
      setLocalDraft(newValue);
      debouncedSetMessageDraft(newValue);
      setMessageBytes(byteLength);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localDraft.trim()) return;

    startTransition(() => {
      sendText(localDraft.trim());
      setLocalDraft("");
      clearDraft(to);
      setMessageBytes(0);
    });
  };

  return (
    <div className="flex gap-2">
      <form className="w-full" onSubmit={handleSubmit}>
        <div className="flex grow gap-2">
          <label className="w-full">
            <Input
              autoFocus
              minLength={1}
              name="messageInput"
              placeholder="Enter Message"
              value={localDraft}
              onChange={handleInputChange}
            />
          </label>

          <label data-testid="byte-counter" className="flex items-center w-24 p-2 place-content-end">
            {messageBytes}/{maxBytes}
          </label>

          <Button
            type="submit"
            className="dark:bg-white dark:text-slate-900 dark:hover:bg-slate-400 dark:hover:text-white"
          >
            <SendIcon size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};
