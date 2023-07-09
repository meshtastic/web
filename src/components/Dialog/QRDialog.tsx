import { Checkbox } from "@components/UI/Checkbox.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.js";
import { Input } from "@components/UI/Input.js";
import { Label } from "@components/UI/Label.js";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { fromByteArray } from "base64-js";
import { ClipboardIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { QRCode } from "react-qrcode-logo";

export interface QRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config_LoRaConfig;
  channels: Map<Types.ChannelNumber, Protobuf.Channel>;
}

export const QRDialog = ({
  open,
  onOpenChange,
  loraConfig,
  channels,
}: QRDialogProps): JSX.Element => {
  const [selectedChannels, setSelectedChannels] = useState<number[]>([0]);
  const [QRCodeURL, setQRCodeURL] = useState<string>("");

  const allChannels = Array.from(channels.values());

  useEffect(() => {
    const channelsToEncode = allChannels
      .filter((ch) => selectedChannels.includes(ch.index))
      .map((channel) => channel.settings)
      .filter((ch): ch is Protobuf.ChannelSettings => !!ch);
    const encoded = new Protobuf.ChannelSet(
      new Protobuf.ChannelSet({
        loraConfig,
        settings: channelsToEncode,
      }),
    );
    const base64 = fromByteArray(encoded.toBinary())
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    setQRCodeURL(`https://meshtastic.org/e/#${base64}`);
  }, [channels, selectedChannels, loraConfig]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate QR Code</DialogTitle>
          <DialogDescription>
            The current LoRa configuration will also be shared.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex gap-3 px-4 py-5 sm:p-6">
            <div className="flex w-40 flex-col gap-2">
              {allChannels.map((channel) => (
                <div className="flex justify-between" key={channel.index}>
                  <Label>
                    {channel.settings?.name.length
                      ? channel.settings.name
                      : channel.role === Protobuf.Channel_Role.PRIMARY
                      ? "Primary"
                      : `Channel: ${channel.index}`}
                  </Label>
                  <Checkbox
                    key={channel.index}
                    checked={selectedChannels.includes(channel.index)}
                    onCheckedChange={() => {
                      if (selectedChannels.includes(channel.index)) {
                        setSelectedChannels(
                          selectedChannels.filter((c) => c !== channel.index),
                        );
                      } else {
                        setSelectedChannels([
                          ...selectedChannels,
                          channel.index,
                        ]);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            <QRCode value={QRCodeURL} size={200} qrStyle="dots" />
          </div>
        </div>
        <DialogFooter>
          <Label>Sharable URL</Label>
          <Input
            value={QRCodeURL}
            disabled
            action={{
              icon: ClipboardIcon,
              onClick() {
                void navigator.clipboard.writeText(QRCodeURL);
              },
            }}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
