import { Input } from "@components/form/Input.js";
import { useDevice } from "@core/stores/deviceStore.js";
import type { Channel } from "@core/stores/deviceStore.js";
import { SendIcon } from "lucide-react";
import type { Types } from "@meshtastic/meshtasticjs";
import { Button } from "@app/components/UI/Button.js";

export interface MessageInputProps {
  channel: Channel;
}

export const MessageInput = ({ channel }: MessageInputProps): JSX.Element => {
  const { connection, setMessageState, messageDraft, setMessageDraft } =
    useDevice();

  const sendText = async (message: string) => {
    await connection
      ?.sendText(
        message,
        "broadcast",
        true,
        channel.config.index as Types.ChannelNumber
      )
      .then((id) => setMessageState(channel.config.index, id, "ack"))
      .catch((e: Types.PacketError) =>
        setMessageState(channel.config.index, e.id, e.error)
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
              label=""
              placeholder="Enter Message"
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
            />
          </span>
          <Button variant="subtle">
            <SendIcon size={16} className="text-slate-500" />
          </Button>
        </div>
      </form>
    </div>
  );
};
