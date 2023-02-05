import { useEffect, useState } from "react";
import { fromByteArray } from "base64-js";
import { QRCode } from "react-qrcode-logo";
import { Checkbox } from "@components/form/Checkbox.js";
import { Input } from "@components/form/Input.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@components/UI/Dialog.js";
import { ClipboardIcon } from "lucide-react";
import { Protobuf } from "@meshtastic/meshtasticjs";

export interface QRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config_LoRaConfig;
  channels: Protobuf.Channel[];
}

export const QRDialog = ({
  open,
  onOpenChange,
  loraConfig,
  channels
}: QRDialogProps): JSX.Element => {
  const [selectedChannels, setSelectedChannels] = useState<number[]>([0]);
  const [QRCodeURL, setQRCodeURL] = useState<string>("");

  useEffect(() => {
    const channelsToEncode = channels
      .filter((channel) => selectedChannels.includes(channel.index))
      .map((channel) => channel.settings)
      .filter((ch): ch is Protobuf.ChannelSettings => !!ch);
    const encoded = new Protobuf.ChannelSet(
      new Protobuf.ChannelSet({
        loraConfig,
        settings: channelsToEncode
      })
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
            <div className="flex w-40 flex-col gap-1">
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
            <QRCode value={QRCodeURL} size={200} qrStyle="dots" />
          </div>
        </div>
        <DialogFooter>
          <Input
            label="Sharable URL"
            value={QRCodeURL}
            disabled
            action={{
              icon: <ClipboardIcon size={16} />,
              action() {
                void navigator.clipboard.writeText(QRCodeURL);
              }
            }}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
