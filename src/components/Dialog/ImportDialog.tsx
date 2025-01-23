import { Button } from "@components/UI/Button.tsx";
import { Checkbox } from "@components/UI/Checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
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
  const [importDialogInput, setImportDialogInput] = useState<string>("");
  const [channelSet, setChannelSet] = useState<Protobuf.AppOnly.ChannelSet>();
  const [validUrl, setValidUrl] = useState<boolean>(false);

  const { connection } = useDevice();

  useEffect(() => {
    // the channel information is contained in the URL's fragment, which will be present after a
    // non-URL encoded `#`.
    try {
      const channelsUrl = new URL(importDialogInput);
      if (
        (channelsUrl.hostname !== "meshtastic.org" &&
          channelsUrl.pathname !== "/e/") ||
        !channelsUrl.hash
      ) {
        throw "Invalid Meshtastic URL";
      }

      const encodedChannelConfig = channelsUrl.hash.substring(1);
      const paddedString = encodedChannelConfig
        .padEnd(
          encodedChannelConfig.length +
            ((4 - (encodedChannelConfig.length % 4)) % 4),
          "=",
        )
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      setChannelSet(
        Protobuf.AppOnly.ChannelSet.fromBinary(toByteArray(paddedString)),
      );
      setValidUrl(true);
    } catch (error) {
      setValidUrl(false);
      setChannelSet(undefined);
    }
  }, [importDialogInput]);

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
            value={importDialogInput}
            suffix={validUrl ? "✅" : "❌"}
            onChange={(e) => {
              setImportDialogInput(e.target.value);
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
