import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import type { Types } from "@meshtastic/core";
import { SendIcon } from "lucide-react";
import { startTransition, useState } from "react";
import { useMessageStore } from "@core/stores/messageStore/index.ts";

export interface MessageInputProps {
  onSend: (message: string) => void;
  to: Types.Destination;
  maxBytes: number;
}

export const MessageInput = ({
  onSend,
  to,
  maxBytes,
}: MessageInputProps) => {
  const { setDraft, getDraft, clearDraft } = useMessageStore();

  const calculateBytes = (text: string) => new Blob([text]).size;

  const initialDraft = getDraft(to);
  const [localDraft, setLocalDraft] = useState(initialDraft);
  const [messageBytes, setMessageBytes] = useState(() =>
    calculateBytes(initialDraft)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const byteLength = calculateBytes(newValue);

    if (byteLength <= maxBytes) {
      setLocalDraft(newValue);
      setMessageBytes(byteLength);
      setDraft(to, newValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localDraft.trim()) return;
    // Reset bytes *before* sending (consider if onSend failure needs different handling)
    setMessageBytes(0);

    startTransition(() => {
      onSend(localDraft.trim());
      setLocalDraft("");
      clearDraft(to);
    });
  };

  return (
    <div className="flex gap-2">
      <form className="w-full" name="messageInput" onSubmit={handleSubmit}>
        <div className="flex grow gap-1">
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

          <label
            data-testid="byte-counter"
            className="flex items-center w-20 p-1 text-sm place-content-end"
          >
            {messageBytes}/{maxBytes}
          </label>

          <Button
            type="submit"
            variant="default"
          >
            <SendIcon size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};
