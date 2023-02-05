import { IconButton } from "@components/form/IconButton.js";
import { Input } from "@components/form/Input.js";
import { useDevice } from "@core/providers/useDevice.js";
import type { Channel } from "@core/stores/deviceStore.js";
import { MapPinIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { Types } from "@meshtastic/meshtasticjs";

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
          <IconButton
            icon={<PaperAirplaneIcon className="text-slate-500 h-4" />}
          />
        </div>
      </form>
      <IconButton icon={<MapPinIcon className="text-slate-500 h-4" />} />
    </div>
  );
};
