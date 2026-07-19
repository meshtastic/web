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
import { useDevice } from "@core/stores";
import {
  createChannelImportPlan,
  parseChannelShare,
  type ChannelShareMode,
  type ParsedChannelShare,
} from "@core/utils/channelShare.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useChannels, useConfigEditor } from "@meshtastic/sdk-react";
import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportDialog = ({ open, onOpenChange }: ImportDialogProps) => {
  const { config } = useDevice();
  const editor = useConfigEditor();
  const channels = useChannels();
  const { t } = useTranslation("dialog");
  const [input, setInput] = useState("");
  const [share, setShare] = useState<ParsedChannelShare>();
  const [mode, setMode] = useState<ChannelShareMode>("replace");
  const [selectedSlots, setSelectedSlots] = useState<number[]>();

  const existingChannels = useMemo(
    () =>
      channels.map((channel) =>
        create(Protobuf.Channel.ChannelSchema, {
          index: channel.index,
          role: channel.role,
          settings: channel.settings,
        }),
      ),
    [channels],
  );
  const plan = useMemo(
    () =>
      share
        ? createChannelImportPlan(share, existingChannels, mode, selectedSlots)
        : undefined,
    [existingChannels, mode, selectedSlots, share],
  );

  const parse = (value: string) => {
    setInput(value);
    if (!value) {
      setShare(undefined);
      setSelectedSlots(undefined);
      return;
    }
    try {
      const parsed = parseChannelShare(value);
      setShare(parsed);
      setMode(parsed.addOnly ? "add" : "replace");
      setSelectedSlots(undefined);
    } catch {
      setShare(undefined);
      setSelectedSlots(undefined);
    }
  };

  const changeMode = (nextMode: ChannelShareMode) => {
    setMode(nextMode);
    setSelectedSlots(undefined);
  };

  const changeSlot = (incomingIndex: number, targetIndex: number) => {
    if (!plan) return;
    const nextSlots = plan.assignments.map(
      (assignment) => assignment.targetIndex,
    );
    nextSlots[incomingIndex] = targetIndex;
    setSelectedSlots(nextSlots);
  };

  const apply = () => {
    if (!editor || !share || !plan || !plan.canApply) return;
    for (const assignment of plan.assignments) {
      const settings = share.channelSet.settings[assignment.incomingIndex];
      if (!settings || assignment.targetIndex < 0) continue;
      editor.setChannel(
        create(Protobuf.Channel.ChannelSchema, {
          index: assignment.targetIndex,
          role:
            assignment.targetIndex === 0
              ? Protobuf.Channel.Channel_Role.PRIMARY
              : Protobuf.Channel.Channel_Role.SECONDARY,
          settings,
        }),
      );
    }
    if (plan.applyLora && share.channelSet.loraConfig) {
      editor.setRadioSection("lora", {
        ...config.lora,
        ...share.channelSet.loraConfig,
      } as Protobuf.Config.Config_LoRaConfig);
    }
    parse("");
    onOpenChange(false);
  };

  const slotOptions =
    plan?.mode === "add"
      ? plan.availableSlots
      : Array.from({ length: 8 }, (_, index) => index);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="import.description"
              components={{ italic: <i />, br: <br /> }}
            />
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Label>{t("import.channelSetUrl")}</Label>
          <Input
            value={input}
            variant={input === "" ? "default" : share ? "dirty" : "invalid"}
            onChange={(event) => parse(event.target.value)}
          />
          {share && plan && (
            <div className="flex flex-col gap-4 mt-2">
              <ModePicker
                addOnly={share.addOnly}
                mode={plan.mode}
                onChange={changeMode}
              />
              <p className="text-sm text-text-secondary">
                {t(
                  plan.mode === "replace"
                    ? "import.replaceDescription"
                    : "import.addDescription",
                )}
              </p>
              {share.addOnly && (
                <p className="text-sm text-text-secondary">
                  {t("import.addOnly")}
                </p>
              )}
              <p className="text-sm text-text-secondary">
                {t(
                  plan.applyLora
                    ? "import.loraWillApply"
                    : "import.loraWillNotApply",
                )}
              </p>
              {plan.duplicateNames.length > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t("import.duplicateNames", {
                    names: plan.duplicateNames.join(", "),
                  })}
                </p>
              )}
              {plan.capacityShortfall > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t("import.capacity", {
                    available: plan.availableSlots.length,
                    needed: share.channelSet.settings.length,
                  })}
                </p>
              )}
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center font-semibold text-sm">
                  <span className="flex-1">{t("import.channelName")}</span>
                  <span className="flex-1">{t("import.channelSlot")}</span>
                </div>
                {plan.assignments.map((assignment) => {
                  const channel =
                    share.channelSet.settings[assignment.incomingIndex];
                  if (!channel) return null;
                  return (
                    <div
                      className="flex items-center"
                      key={assignment.incomingIndex}
                    >
                      <Label className="flex-1">
                        {channel.name.length
                          ? channel.name
                          : `${t("import.channelPrefix")}${channel.id}`}
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          changeSlot(
                            assignment.incomingIndex,
                            Number.parseInt(value, 10),
                          )
                        }
                        value={assignment.targetIndex.toString()}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {slotOptions.map((slot) => (
                            <SelectItem
                              disabled={plan.assignments.some(
                                (other) =>
                                  other.incomingIndex !==
                                    assignment.incomingIndex &&
                                  other.targetIndex === slot,
                              )}
                              key={slot}
                              value={slot.toString()}
                            >
                              {slot === 0
                                ? t("import.primary")
                                : `${t("import.channelPrefix")}${slot}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button disabled={!plan?.canApply} name="apply" onClick={apply}>
            {t("button.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ModePicker = ({
  addOnly,
  mode,
  onChange,
}: {
  addOnly: boolean;
  mode: ChannelShareMode;
  onChange: (mode: ChannelShareMode) => void;
}) => {
  const { t } = useTranslation("dialog");
  return (
    <fieldset className="flex border-0 p-0" aria-label={t("import.mode")}>
      {(["replace", "add"] as const).map((modeOption) => (
        <button
          className={`h-10 border-slate-900 border-t border-b px-4 py-2 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-offset-2 first:rounded-l last:rounded-r disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === modeOption
              ? "bg-green-800 text-white focus:ring-green-800"
              : "bg-slate-400 hover:bg-green-600 focus:ring-slate-400"
          }`}
          disabled={addOnly && modeOption === "replace"}
          key={modeOption}
          onClick={() => onChange(modeOption)}
          type="button"
        >
          {t(`qr.${modeOption}Channels`)}
        </button>
      ))}
    </fieldset>
  );
};
