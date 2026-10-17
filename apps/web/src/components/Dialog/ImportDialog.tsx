import { create } from "@bufbuild/protobuf";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { useDevice } from "@core/stores";
import type { BeaconJoinPlan } from "@core/utils/beaconJoin.ts";
import { channelSetFromUrl } from "@core/utils/channelUrl.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor } from "@meshtastic/sdk-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
  /** A Mesh Beacon offer to join: fills in its URL and target slot. */
  beaconJoin?: BeaconJoinPlan;
}

export const ImportDialog = ({
  open,
  onOpenChange,
  beaconJoin,
}: ImportDialogProps) => {
  const { config } = useDevice();
  const editor = useConfigEditor();
  const { t } = useTranslation("dialog");
  const navigate = useNavigate();
  // Undefined until the user types, so a beacon join shows its own URL.
  const [typedInput, setImportDialogInput] = useState<string>();
  const importDialogInput = typedInput ?? beaconJoin?.url ?? "";
  const [channelSet, setChannelSet] = useState<Protobuf.AppOnly.ChannelSet>();
  const [validUrl, setValidUrl] = useState<boolean>(false);
  const [updateConfig, setUpdateConfig] = useState<boolean>(true);
  const [importIndex, setImportIndex] = useState<number[]>([]);

  // A beacon join locks in its target slots and, for a switch, the LoRa
  // config, as long as the URL is still the offer's.
  const joining =
    beaconJoin !== undefined && importDialogInput === beaconJoin.url
      ? beaconJoin
      : undefined;

  useEffect(() => {
    try {
      const newChannelSet = channelSetFromUrl(importDialogInput);

      const newImportChannelArray = joining
        ? joining.indices
        : newChannelSet.settings.map((_, idx) => idx);

      setChannelSet(newChannelSet);
      setImportIndex(newImportChannelArray);
      setUpdateConfig(newChannelSet?.loraConfig !== undefined);
      setValidUrl(true);
    } catch {
      setValidUrl(false);
      setChannelSet(undefined);
    }
  }, [importDialogInput, joining]);

  const reset = () => {
    setImportDialogInput(undefined);
    setChannelSet(undefined);
    setValidUrl(false);
    setImportIndex([]);
    setUpdateConfig(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const apply = () => {
    if (!editor) return;
    channelSet?.settings.forEach(
      (ch: Protobuf.Channel.ChannelSettings, index: number) => {
        if (importIndex[index] === -1) {
          return;
        }

        const payload = create(Protobuf.Channel.ChannelSchema, {
          index: importIndex[index],
          role:
            importIndex[index] === 0
              ? Protobuf.Channel.Channel_Role.PRIMARY
              : Protobuf.Channel.Channel_Role.SECONDARY,
          settings: ch,
        });

        editor.setChannel(payload);
      },
    );

    if (channelSet?.loraConfig && updateConfig) {
      const payload = {
        ...config.lora,
        ...channelSet.loraConfig,
      } as Protobuf.Config.Config_LoRaConfig;
      editor.setRadioSection("lora", payload);
    }
    handleOpenChange(false);
    // Apply only stages the change; take a beacon join to where it's saved.
    if (joining) navigate({ to: "/settings/lora" });
  };

  const onSelectChange = (value: string, index: number) => {
    const newImportIndex = [...importIndex];
    newImportIndex[index] = Number.parseInt(value, 10);
    setImportIndex(newImportIndex);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey={"import.description"}
              components={{ italic: <i />, br: <br /> }}
            />
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {joining && (
            <div
              role="note"
              className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
            >
              <p className="font-semibold">
                {joining.option === "switch"
                  ? t("import.beacon.switchTitle")
                  : t("import.beacon.addTitle")}
              </p>
              <p>
                {joining.option === "switch"
                  ? t("import.beacon.switchDescription")
                  : joining.noFreeSlot
                    ? t("import.beacon.noFreeSlot")
                    : t("import.beacon.addDescription")}
              </p>
            </div>
          )}
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
                    disabled={joining?.option === "switch"}
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
                      disabled={joining?.option === "switch"}
                      value={importIndex[index]?.toString()}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 8 }, (_, i) => i).map((i) => (
                          <SelectItem
                            key={`index_${i}`}
                            disabled={importIndex.some(
                              (slot, other) => slot === i && other !== index,
                            )}
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
          <Button
            onClick={apply}
            disabled={
              !validUrl ||
              (joining !== undefined && importIndex.every((i) => i === -1))
            }
            name="apply"
          >
            {t("button.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
