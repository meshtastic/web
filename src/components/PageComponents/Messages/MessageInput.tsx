import { debounce } from "@app/core/utils/debounce";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Types } from "@meshtastic/core";
import { SendIcon } from "lucide-react";
import {
  type JSX,
  startTransition,
  useCallback,
  useMemo,
  useState,
} from "react";

export interface MessageInputProps {
  to: Types.Destination;
  channel: Types.ChannelNumber;
  maxBytes: number;
}

export const MessageInput = ({
  to,
  channel,
  maxBytes,
}: MessageInputProps): JSX.Element => {
  const {
    connection,
    setMessageState,
    messageDraft,
    setMessageDraft,
    hardware,
  } = useDevice();
  const myNodeNum = hardware.myNodeNum;
  const [localDraft, setLocalDraft] = useState(messageDraft);
  const [messageBytes, setMessageBytes] = useState(0);

  const debouncedSetMessageDraft = useMemo(
    () => debounce(setMessageDraft, 300),
    [setMessageDraft],
  );

  const sendText = useCallback(
    async (message: string) => {
      await connection
        ?.sendText(message, to, true, channel)
        .then((id) =>
          setMessageState(
            to === "broadcast" ? "broadcast" : "direct",
            channel,
            to as number,
            myNodeNum,
            id,
            "ack",
          ),
        )
        .catch((e: Types.PacketError) =>
          setMessageState(
            to === "broadcast" ? "broadcast" : "direct",
            channel,
            to as number,
            myNodeNum,
            e.id,
            e.error,
          ),
        );
    },
    [channel, connection, myNodeNum, setMessageState, to],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const byteLength = new Blob([newValue]).size;

    if (byteLength <= maxBytes) {
      setLocalDraft(newValue);
      debouncedSetMessageDraft(newValue);
      setMessageBytes(byteLength);
    }
  };

  return (
    <div className="flex gap-2">
      <form
        className="w-full"
        action={async (formData: FormData) => {
          // prevent user from sending blank/empty message
          if (localDraft === "") return;
          const message = formData.get("messageInput") as string;
          startTransition(() => {
            sendText(message);
            setLocalDraft("");
            setMessageDraft("");
            setMessageBytes(0);
          });
        }}
      >
        <div className="flex grow gap-2">
          <span className="w-full">
            <Input
              autoFocus={true}
              minLength={1}
              name="messageInput"
              placeholder="Enter Message"
              value={localDraft}
              onChange={handleInputChange}
            />
          </span>
          <div className="flex items-center w-24 p-2 place-content-end">
            {messageBytes}/{maxBytes}
          </div>

          <Button type="submit">
            <SendIcon size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};
