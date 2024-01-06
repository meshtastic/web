import { Button } from "@components/UI/Button.js";
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
import { Switch } from "@components/UI/Switch.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";
import { toByteArray } from "base64-js";
import { useEffect, useState } from "react";

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
}

export const ImportDialog = ({
  open,
  onOpenChange,
}: ImportDialogProps): JSX.Element => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [channelSet, setChannelSet] = useState<Protobuf.AppOnly.ChannelSet>();
  const [validUrl, setValidUrl] = useState<boolean>(false);

  const { connection } = useDevice();

  useEffect(() => {
    const base64String = qrCodeUrl.split("e/#")[1];
    const paddedString = base64String
      ?.padEnd(base64String.length + ((4 - (base64String.length % 4)) % 4), "=")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    try {
      setChannelSet(
        Protobuf.AppOnly.ChannelSet.fromBinary(toByteArray(paddedString)),
      );
      setValidUrl(true);
    } catch (error) {
      setValidUrl(false);
      setChannelSet(undefined);
    }
  }, [qrCodeUrl]);

  const apply = () => {
    channelSet?.settings.map((ch, index) => {
      connection?.setChannel(
        new Protobuf.Channel.Channel({
          index,
          role:
            index === 0
              ? Protobuf.Channel.Channel_Role.PRIMARY
              : Protobuf.Channel.Channel_Role.SECONDARY,
          settings: ch,
        }),
      );
    });

    if (channelSet?.loraConfig) {
      connection?.setConfig(
        new Protobuf.Config.Config({
          payloadVariant: {
            case: "lora",
            value: channelSet.loraConfig,
          },
        }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Channel Set</DialogTitle>
          <DialogDescription>
            The current LoRa configuration will be overridden.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Label>Channel Set/QR Code URL</Label>
          <Input
            value={qrCodeUrl}
            suffix={validUrl ? "✅" : "❌"}
            onChange={(e) => {
              setQrCodeUrl(e.target.value);
            }}
          />
          {validUrl && (
            <div className="flex flex-col gap-3">
              <div className="flex w-full gap-2">
                <div className="w-36">
                  <Label>Use Preset?</Label>
                  <Switch
                    disabled={true}
                    checked={channelSet?.loraConfig?.usePreset ?? true}
                  />
                </div>
                {/* <Select
                  label="Modem Preset"
                  disabled
                  value={channelSet?.loraConfig?.modemPreset}
                >
                  {renderOptions(Protobuf.Config_LoRaConfig_ModemPreset)}
                </Select> */}
              </div>
              {/* <Select
                label="Region"
                disabled
                value={channelSet?.loraConfig?.region}
              >
                {renderOptions(Protobuf.Config_LoRaConfig_RegionCode)}
              </Select> */}

              <span className="text-md block font-medium text-textPrimary">
                Channels:
              </span>
              <div className="flex w-40 flex-col gap-1">
                {channelSet?.settings.map((channel) => (
                  <div className="flex justify-between" key={channel.id}>
                    <Label>
                      {channel.name.length
                        ? channel.name
                        : `Channel: ${channel.id}`}
                    </Label>
                    <Checkbox key={channel.id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={apply} disabled={!validUrl}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
