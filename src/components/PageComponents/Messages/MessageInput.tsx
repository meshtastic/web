import { Input } from "@components/UI/Input.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { SendIcon } from "lucide-react";
import type { Types } from "@meshtastic/meshtasticjs";
import { Button } from "@components/UI/Button.js";

export interface MessageInputProps {
  to: Types.Destination;
  channel: Types.ChannelNumber;
}

export const MessageInput = ({
  to,
  channel
}: MessageInputProps): JSX.Element => {
  const {
    connection,
    setMessageState,
    messageDraft,
    setMessageDraft,
    hardware
  } = useDevice();

  const myNodeNum = hardware.myNodeNum;

  const sendText = async (message: string) => {
    await connection
      ?.sendText(message, to, true, channel)
      .then((id) =>
        setMessageState(
          to === "broadcast" ? "broadcast" : "direct",
          channel,
          to as number,
          myNodeNum,
          id,
          "ack"
        )
      )
      .catch((e: Types.PacketError) =>
        setMessageState(
          to === "broadcast" ? "broadcast" : "direct",
          channel,
          to as number,
          myNodeNum,
          e.id,
          e.error
        )
      );
  };

  return (
    <div className="flex gap-2">
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          sendText(messageDraft);
          setMessageDraft("");
        }}
      >
        <div className="flex flex-grow gap-2">
          <span className="w-full">
            <Input
              autoFocus
              minLength={2}
              placeholder="Enter Message"
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
            />
          </span>
          <Button>
            <SendIcon size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};
