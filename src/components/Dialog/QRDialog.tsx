import type React from "react";
import { useEffect, useState } from "react";

import { fromByteArray } from "base64-js";
import { QRCode } from "react-qrcode-logo";

import { Dialog } from "@headlessui/react";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";

import { Checkbox } from "../form/Checkbox.js";
import { Input } from "../form/Input.js";

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
    <Dialog open={isOpen} onClose={close}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-3">
          <Dialog.Title>Generate QR Code</Dialog.Title>

          <Dialog.Description>
            This will permanently deactivate your account
          </Dialog.Description>
          <div className="flex">
            <div className="flex flex-col">
              <span className="font-medium text-lg">Channels to include</span>
              <span className="text-sm text-slate-600">
                The current LoRa configuration will also be shared.
              </span>
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
            </div>
            <div className="flex flex-col flex-grow m-2">
              <div className="flex m-auto">
                <QRCode value={QRCodeURL} size={250} qrStyle="dots" />
              </div>
              <div className="flex gap-2">
                <Input
                  label="Sharable URL"
                  value={QRCodeURL}
                  action={{
                    icon: <ClipboardIcon className="h-4" />,
                    action: () => {
                      console.log("");
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
