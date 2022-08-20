import type React from "react";
import { useEffect, useState } from "react";

import { fromByteArray } from "base64-js";
import {
  Checkbox,
  ClipboardIcon,
  Dialog,
  FormField,
  IconButton,
  majorScale,
  Pane,
  TextInputField,
  Tooltip,
} from "evergreen-ui";
import { QRCode } from "react-qrcode-logo";

import { Protobuf } from "@meshtastic/meshtasticjs";

export interface QRDialogProps {
  isOpen: boolean;
  close: () => void;
  loraConfig?: Protobuf.Config_LoRaConfig;
  channels: Protobuf.Channel[];
}

export const QRDialog = ({
  isOpen,
  close,
  loraConfig,
  channels,
}: QRDialogProps): JSX.Element => {
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [QRCodeURL, setQRCodeURL] = useState<string>("");

  useEffect(() => {
    const channelsToEncode = channels
      .filter((channel) => selectedChannels.includes(channel.index))
      .map((channel) => channel.settings)
      .filter((ch): ch is Protobuf.ChannelSettings => !!ch);
    const encoded = Protobuf.ChannelSet.toBinary(
      Protobuf.ChannelSet.create({
        loraConfig,
        settings: channelsToEncode,
      })
    );
    const base64 = fromByteArray(encoded)
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    setQRCodeURL(`https://www.meshtastic.org/e/#${base64}`);
  }, [channels, selectedChannels, loraConfig]);

  return (
    <Dialog
      isShown={isOpen}
      title="Generate QR Code"
      onCloseComplete={close}
      hasFooter={false}
    >
      <Pane display="flex">
        <FormField
          width="12rem"
          label="Channels to include"
          description="The current LoRa configuration will also be shared."
        >
          {channels.map((channel) => (
            <Checkbox
              key={channel.index}
              disabled={channel.role === Protobuf.Channel_Role.DISABLED}
              label={
                channel.settings?.name.length
                  ? channel.settings.name
                  : channel.role === Protobuf.Channel_Role.PRIMARY
                  ? "Primary"
                  : `Channel: ${channel.index}`
              }
              checked={selectedChannels.includes(channel.index)}
              onChange={() => {
                if (selectedChannels.includes(channel.index)) {
                  setSelectedChannels(
                    selectedChannels.filter((c) => c !== channel.index)
                  );
                } else {
                  setSelectedChannels([...selectedChannels, channel.index]);
                }
              }}
            />
          ))}
        </FormField>
        <Pane
          display="flex"
          flexDirection="column"
          flexGrow={1}
          margin={majorScale(1)}
        >
          <Pane display="flex" margin="auto">
            <QRCode value={QRCodeURL} qrStyle="dots" />
          </Pane>
          <Pane display="flex" gap={majorScale(1)}>
            <TextInputField
              label="Sharable URL"
              value={QRCodeURL}
              width="100%"
            />
            <Tooltip content="Copy to Clipboard">
              <IconButton icon={ClipboardIcon} marginTop="1.6rem" />
            </Tooltip>
          </Pane>
        </Pane>
      </Pane>
    </Dialog>
  );
};
