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
import { Protobuf } from "@meshtastic/meshtasticjs";
import { toByteArray } from "base64-js";
import { useEffect, useState } from "react";

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config_LoRaConfig;
}

export const ImportDialog = ({
  open,
  onOpenChange,
}: ImportDialogProps): JSX.Element => {
  const [QRCodeURL, setQRCodeURL] = useState<string>("");
  const [channelSet, setChannelSet] = useState<Protobuf.ChannelSet>();
  const [validURL, setValidURL] = useState<boolean>(false);

  const { connection } = useDevice();

  useEffect(() => {
    const base64String = QRCodeURL.split("e/#")[1]
      ?.replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(QRCodeURL.length + ((4 - (QRCodeURL.length % 4)) % 4), "=");
    try {
      setChannelSet(Protobuf.ChannelSet.fromBinary(toByteArray(base64String)));
      setValidURL(true);
    } catch (error) {
      setValidURL(false);
      setChannelSet(undefined);
    }
  }, [QRCodeURL]);

  const apply = () => {
    channelSet?.settings.map((ch, index) => {
      connection?.setChannel(
        new Protobuf.Channel({
          index,
          role:
            index === 0
              ? Protobuf.Channel_Role.PRIMARY
              : Protobuf.Channel_Role.SECONDARY,
          settings: ch,
        }),
      );
    });

    if (channelSet?.loraConfig) {
      connection?.setConfig(
        new Protobuf.Config({
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
            value={QRCodeURL}
            suffix={validURL ? "✅" : "❌"}
            onChange={(e) => {
              setQRCodeURL(e.target.value);
            }}
          />
          {validURL && (
            <div className="flex flex-col gap-3">
              <div className="flex w-full gap-2">
                <div className="w-36">
                  <Label>Use Preset?</Label>
                  <Switch
                    disabled
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
          <Button onClick={apply} disabled={!validURL}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
