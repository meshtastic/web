import type React from "react";

import { useForm } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { IconButton } from "@app/components/IconButton.js";
import { useDevice } from "@core/providers/useDevice.js";
import type { Channel } from "@core/stores/deviceStore.js";
import { MapPinIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type { Types } from "@meshtastic/meshtasticjs";

export interface MessageInputProps {
  channel: Channel;
}

export const MessageInput = ({ channel }: MessageInputProps): JSX.Element => {
  const { connection, ackMessage } = useDevice();

  const { register, handleSubmit } = useForm<{
    message: string;
  }>({
    defaultValues: {
      message: ""
    }
  });

  const onSubmit = handleSubmit((data) => {
    void connection?.sendText({
      text: data.message,
      wantAck: true,
      channel: channel.config.index as Types.ChannelNumber,
      callback: (id) => {
        ackMessage(channel.config.index, id);
        return Promise.resolve();
      }
    });
  });

  return (
    <div className="flex gap-2">
      <form className="w-full" onSubmit={onSubmit}>
        <div className="flex flex-grow gap-2">
          <span className="w-full">
            <Input
              autoFocus
              minLength={2}
              label=""
              placeholder="Enter Message"
              {...register("message")}
            />
          </span>
          <IconButton
            variant="secondary"
            icon={<PaperAirplaneIcon className="h-4 text-slate-500" />}
          />
        </div>
      </form>
      <IconButton
        variant="secondary"
        icon={<MapPinIcon className="h-4 text-slate-500" />}
      />
    </div>
  );
};
