import type React from "react";
import { useEffect, useState } from "react";

import { fromByteArray, toByteArray } from "base64-js";
import { toast } from "react-hot-toast";
import { QRCode } from "react-qrcode-logo";

import { Checkbox } from "@components/form/Checkbox.js";
import { Input } from "@components/form/Input.js";
import { Dialog } from "@components/generic/Dialog.js";
import { ClipboardIcon } from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { Select } from "../form/Select.js";
import { renderOptions } from "@app/core/utils/selectEnumOptions.js";
import { Toggle } from "../form/Toggle.js";
import { Button } from "../form/Button.js";
import { useDevice } from "@app/core/providers/useDevice.js";

export interface ImportDialogProps {
  isOpen: boolean;
  close: () => void;
  loraConfig?: Protobuf.Config_LoRaConfig;
  channels: Protobuf.Channel[];
}

export const ImportDialog = ({
  isOpen,
  close
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
      connection?.setChannel({
        channel: {
          index,
          role:
            index === 0
              ? Protobuf.Channel_Role.PRIMARY
              : Protobuf.Channel_Role.SECONDARY,
          settings: ch
        }
      });
    });

    if (channelSet?.loraConfig) {
      connection?.setConfig({
        config: {
          payloadVariant: {
            oneofKind: "lora",
            lora: channelSet.loraConfig
          }
        }
      });
    }
  };

  return (
    <Dialog
      title={"Import Channel Set"}
      description={"The current LoRa configuration will be overridden."}
      isOpen={isOpen}
      close={close}
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Channel Set/QR Code URL"
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
                <Toggle
                  className="flex-col gap-2"
                  label="Use Preset?"
                  disabled
                  checked={channelSet?.loraConfig?.usePreset ?? true}
                />
              </div>
              <Select
                label="Modem Preset"
                disabled
                value={channelSet?.loraConfig?.modemPreset}
              >
                {renderOptions(Protobuf.Config_LoRaConfig_ModemPreset)}
              </Select>
            </div>
            <Select
              label="Region"
              disabled
              value={channelSet?.loraConfig?.region}
            >
              {renderOptions(Protobuf.Config_LoRaConfig_RegionCode)}
            </Select>

            <span className="text-md block font-medium text-gray-700">
              Channels:
            </span>
            <div className="flex w-40 flex-col gap-1">
              {channelSet?.settings.map((channel, index) => (
                <Checkbox
                  key={index}
                  label={
                    channel.name.length
                      ? channel.name
                      : `Channel: ${channel.id}`
                  }
                />
              ))}
            </div>
          </div>
        )}
        <Button onClick={() => apply()} disabled={!validURL}>
          Apply
        </Button>
      </div>
    </Dialog>
  );
};
