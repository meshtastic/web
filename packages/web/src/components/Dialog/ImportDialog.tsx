import { fromBinary } from "@bufbuild/protobuf";
import { Button } from "@shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Switch } from "@shared/components/ui/switch";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { toByteArray } from "base64-js";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
}

export const ImportDialog = ({ open, onOpenChange }: ImportDialogProps) => {
  const { channels, config } = useDevice();
  const { t } = useTranslation("dialog");
  const [importDialogInput, setImportDialogInput] = useState<string>("");
  const [channelSet, setChannelSet] = useState<Protobuf.AppOnly.ChannelSet>();
  const [validUrl, setValidUrl] = useState<boolean>(false);
  const [updateConfig, setUpdateConfig] = useState<boolean>(true);
  const [importIndex, setImportIndex] = useState<number[]>([]);

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
        throw t("import.error.invalidUrl");
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

      const newChannelSet = fromBinary(
        Protobuf.AppOnly.ChannelSetSchema,
        toByteArray(paddedString),
      );

      const newImportChannelArray = newChannelSet.settings.map((_, idx) => idx);

      setChannelSet(newChannelSet);
      setImportIndex(newImportChannelArray);
      setUpdateConfig(newChannelSet?.loraConfig !== undefined);
      setValidUrl(true);
    } catch (_error) {
      setValidUrl(false);
      setChannelSet(undefined);
    }
  }, [importDialogInput, t]);

  const apply = () => {
    channelSet?.settings.forEach(
      (_ch: Protobuf.Channel.ChannelSettings, index: number) => {
        if (importIndex[index] === -1) {
          return;
        }
        // TODO: Implement channel settings import logic
      },
    );

    if (channelSet?.loraConfig && updateConfig) {
      // TODO: Implement lora config update logic
    }
    // Reset state after import
    setImportDialogInput("");
    setChannelSet(undefined);
    setValidUrl(false);
    setImportIndex([]);
    setUpdateConfig(true);

    onOpenChange(false);
  };

  const onSelectChange = (value: string, index: number) => {
    const newImportIndex = [...importIndex];
    newImportIndex[index] = Number.parseInt(value, 10);
    setImportIndex(newImportIndex);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>
            <Trans i18nKey={"import.description"} />
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Label>{t("import.channelSetUrl")}</Label>
          <Input
            value={importDialogInput}
            variant={
              importDialogInput === ""
                ? "default"
                : validUrl
                  ? "dirty"
                  : "invalid"
            }
            onChange={(e) => {
              setImportDialogInput(e.target.value);
            }}
          />
          {validUrl && (
            <div className="flex flex-col gap-6 mt-2">
              <div className="flex w-full gap-2">
                <div className=" flex items-center">
                  <Switch
                    className="ml-3 mr-4"
                    checked={updateConfig}
                    onCheckedChange={(next) => setUpdateConfig(next)}
                  />
                  <Label className="">
                    {t("import.useLoraConfig")}
                    <span className="block pt-2 font-normal text-s">
                      {t("import.presetDescription")}
                    </span>
                  </Label>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center font-semibold text-sm">
                  <span className="flex-1">{t("import.channelName")}</span>
                  <span className="flex-1">{t("import.channelSlot")}</span>
                </div>
                {channelSet?.settings.map((channel, index) => (
                  <div
                    className="flex items-center"
                    key={`channel_${channel.id}_${index}`}
                  >
                    <Label className="flex-1">
                      {channel.name.length
                        ? channel.name
                        : `${t("import.channelPrefix")}${channel.id}`}
                    </Label>
                    <Select
                      onValueChange={(value) => onSelectChange(value, index)}
                      value={importIndex[index]?.toString()}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 8 }, (_, i) => i).map((i) => (
                          <SelectItem
                            key={`index_${i}`}
                            disabled={importIndex.includes(i) && index !== i}
                            value={i.toString()}
                          >
                            {i === 0
                              ? t("import.primary")
                              : `${t("import.channelPrefix")}${i}`}
                          </SelectItem>
                        ))}
                        <SelectItem value="-1">
                          {t("import.doNotImport")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={apply} disabled={!validUrl} name="apply">
            {t("button.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
