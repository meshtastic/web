import type React from "react";
import { useEffect, useState } from "react";

import { fromByteArray } from "base64-js";
import { QRCode } from "react-qrcode-logo";

import { Dialog } from "@headlessui/react";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";

import { Card } from "../Card.js";
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
        <Dialog.Panel>
          <Card className="max-w-md flex-col">
            <div className="flex h-8 bg-slate-100">
              <span className="m-auto text-lg font-medium">
                Generate QR Code
              </span>
            </div>
            <div className="flex gap-2 p-2">
              <div className="flex flex-col">
                <span className="text-lg font-medium">Channels to include</span>
                <span className="text-sm text-slate-600">
                  The current LoRa configuration will also be shared.
                </span>
                <div className="flex flex-col gap-1">
                  {channels.map((channel) => (
                    <Checkbox
                      key={channel.index}
                      disabled={
                        channel.index === 0 ||
                        channel.role === Protobuf.Channel_Role.DISABLED
                      }
                      label={
                        channel.settings?.name.length
                          ? channel.settings.name
                          : channel.role === Protobuf.Channel_Role.PRIMARY
                          ? "Primary"
                          : `Channel: ${channel.index}`
                      }
                      checked={
                        channel.index === 0 ||
                        selectedChannels.includes(channel.index)
                      }
                      onChange={() => {
                        if (selectedChannels.includes(channel.index)) {
                          setSelectedChannels(
                            selectedChannels.filter((c) => c !== channel.index)
                          );
                        } else {
                          setSelectedChannels([
                            ...selectedChannels,
                            channel.index,
                          ]);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-grow flex-col">
                <div className="m-auto flex">
                  <QRCode value={QRCodeURL} size={200} qrStyle="dots" />
                </div>
                <div className="flex gap-2">
                  <Input
                    label="Sharable URL"
                    value={QRCodeURL}
                    action={{
                      icon: <ClipboardIcon className="h-4" />,
                      action() {
                        console.log("");
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
