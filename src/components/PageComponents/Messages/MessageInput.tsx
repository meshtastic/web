import { debounce } from "@app/core/utils/debounce";
import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Types } from "@meshtastic/js";
import { SendIcon } from "lucide-react";
import { useCallback, useState, useMemo } from "react";



export interface MessageInputProps {
  to: Types.Destination;
  channel: Types.ChannelNumber;
}

export const MessageInput = ({
  to,
  channel,
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

  const debouncedSetMessageDraft = useMemo(
    () => debounce(setMessageDraft, 300),
    [setMessageDraft]
  );

  const sendText = useCallback(async (message: string) => {
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
  }, [channel, connection, myNodeNum, setMessageState, to]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalDraft(newValue);
    debouncedSetMessageDraft(newValue);
  };

  return (
    <div className="flex gap-2">
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          sendText(localDraft);
          setLocalDraft("");
          setMessageDraft("");
        }}
      >
        <div className="flex flex-grow gap-2">
          <span className="w-full">
            <Input
              autoFocus={true}
              minLength={1}
              placeholder="Enter Message"
              value={localDraft}
              onChange={handleInputChange}
            />
          </span>
          <Button type="submit">
            <SendIcon size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};