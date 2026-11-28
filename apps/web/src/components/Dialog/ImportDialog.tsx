import { Button } from "@components/UI/Button.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
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
import { Segmented } from "@components/UI/Segmented.tsx";
import type { RadioConfig } from "@core/kmp/configEditor.ts";
import {
  useChannels,
  useConfigEditor,
  useConnectionProgress,
  useSignal,
} from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import {
  type ChannelImportMode,
  type ChannelImportPlan,
  canReplace,
  defaultImportMode,
  parseChannelLink,
  planChannelImport,
} from "@core/onboarding/channelImport.ts";
import {
  buildChannelEdits,
  replaceRegionChange,
} from "@core/onboarding/saves.ts";
import type { Protobuf } from "@core/protobuf.ts";
import { useDevice } from "@core/stores";
import {
  type BeaconJoinPlan,
  channelSettingsByIndex,
} from "@core/utils/beaconJoin.ts";
import { useNavigate } from "@tanstack/react-router";
import { Result } from "better-result";
import { useId, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

const NO_RADIO = constantSignal<RadioConfig>({});
const NO_CHANNELS = constantSignal<
  ReadonlyMap<number, Protobuf.Channel.Channel>
>(new Map());

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
  /** A Mesh Beacon offer to join: fills in its URL and target slot. */
  beaconJoin?: BeaconJoinPlan;
}

/** A beacon switch puts the offered channel on the primary and retunes. */
const SWITCH_PLAN: ChannelImportPlan = {
  assignments: [{ from: 0, slot: 0, role: "primary" }],
  disable: [],
  skipped: 0,
  alreadyOnRadio: [],
  duplicates: [],
  noSlot: [],
  nameConflicts: [],
  freeSlots: 0,
  applyLora: true,
};

/**
 * Import a channel link with the same Replace / Add choice the share side
 * offers. Replace (the default when the link carries LoRa settings) puts
 * the selected channels in slots from the primary up, clears the rest and
 * applies the link's LoRa settings; Add only fills free secondary slots and
 * leaves the radio's channels and LoRa settings alone. An add link carries
 * no LoRa settings, so it can only be added. Applying stages the change.
 */
export const ImportDialog = ({
  open,
  onOpenChange,
  beaconJoin,
}: ImportDialogProps) => {
  const { config } = useDevice();
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? NO_RADIO);
  const radioChannels = useChannels();
  // Plan against the working copy so channels staged by an earlier import
  // keep their slots.
  const workingChannels = useSignal(editor?.channels ?? NO_CHANNELS);
  const { t } = useTranslation("dialog");
  const navigate = useNavigate();
  const inputId = useId();
  const modeHelpId = useId();

  // Undefined until the user types, so a beacon join shows its own URL.
  const [typedInput, setTypedInput] = useState<string>();
  const input = typedInput ?? beaconJoin?.url ?? "";
  const [modeChoice, setModeChoice] = useState<ChannelImportMode>();
  // Link positions the user unticked.
  const [unselected, setUnselected] = useState<ReadonlyArray<number>>([]);

  // A beacon join keeps its own plan as long as the URL is still the offer's.
  const joining =
    beaconJoin !== undefined && input === beaconJoin.url
      ? beaconJoin
      : undefined;
  const switching = joining?.option === "switch";

  const parsed = useMemo(() => parseChannelLink(input), [input]);
  const channelSet = Result.isOk(parsed) ? parsed.value : undefined;
  const replaceAvailable = channelSet !== undefined && canReplace(channelSet);
  const mode: ChannelImportMode =
    channelSet && replaceAvailable
      ? (modeChoice ?? defaultImportMode(channelSet))
      : "add";

  const current = useMemo(
    () => channelSettingsByIndex([...workingChannels.values()]),
    [workingChannels],
  );
  // Until the radio finishes sending its config the channel list can be
  // partial, and a slot that hasn't arrived would look free (Android waits
  // the same way: `radioChannelsLoaded` in ScannedQrCodeDialog.kt).
  const configured = useConnectionProgress().phase === "configured";
  const currentLora = radio.lora ?? config.lora;
  // The LoRa preset names unnamed channels, so Add can't match them without it.
  const radioLoaded =
    editor !== undefined &&
    configured &&
    radioChannels.length > 0 &&
    currentLora !== undefined;

  const selected = channelSet?.settings
    .map((_, i) => i)
    .filter((i) => !unselected.includes(i));
  const plan = channelSet
    ? switching
      ? SWITCH_PLAN
      : planChannelImport(channelSet, current, mode, selected, currentLora)
    : undefined;
  const edits =
    channelSet && plan
      ? buildChannelEdits(channelSet, plan, currentLora)
      : undefined;
  const loraMissing = edits !== undefined && Result.isError(edits);
  const regionChange =
    channelSet && plan?.applyLora
      ? replaceRegionChange(currentLora, channelSet)
      : undefined;
  const usedSlots = current.filter((s) => s !== undefined).length;

  const reset = () => {
    setTypedInput(undefined);
    setModeChoice(undefined);
    setUnselected([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const apply = () => {
    if (!editor || !edits || Result.isError(edits)) return;
    for (const channel of edits.value.channels) editor.setChannel(channel);
    if (edits.value.lora) editor.setRadioSection("lora", edits.value.lora);
    handleOpenChange(false);
    // Apply only stages the change; take a beacon join to where it's saved.
    if (joining) navigate({ to: "/settings/lora" });
  };

  const toggle = (from: number, on: boolean) => {
    setUnselected((prev) =>
      on ? prev.filter((i) => i !== from) : [...prev, from],
    );
  };

  const rowStatus = (from: number): string => {
    if (!plan || unselected.includes(from)) return t("import.notImported");
    const assignment = plan.assignments.find((a) => a.from === from);
    if (assignment) {
      return assignment.slot === 0
        ? t("import.slotPrimary")
        : t("import.slot", { slot: assignment.slot });
    }
    if (plan.alreadyOnRadio.includes(from)) return t("import.alreadyOnRadio");
    if (plan.duplicates.includes(from)) return t("import.duplicate");
    return t("import.noSlot");
  };

  const linkError = (() => {
    if (Result.isOk(parsed) || parsed.error === "empty") return undefined;
    return parsed.error === "noChannels"
      ? t("import.error.noChannels")
      : t("import.error.invalidUrl");
  })();

  const nothingSelected = selected !== undefined && selected.length === 0;
  const canApply =
    radioLoaded &&
    edits !== undefined &&
    Result.isOk(edits) &&
    (plan?.assignments.length ?? 0) > 0;

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
                {switching
                  ? t("import.beacon.switchTitle")
                  : t("import.beacon.addTitle")}
              </p>
              <p>
                {switching
                  ? t("import.beacon.switchDescription")
                  : plan && plan.noSlot.length > 0
                    ? t("import.beacon.noFreeSlot")
                    : t("import.beacon.addDescription")}
              </p>
            </div>
          )}
          <Label htmlFor={inputId}>{t("import.channelSetUrl")}</Label>
          <Input
            id={inputId}
            value={input}
            variant={
              input === "" ? "default" : channelSet ? "dirty" : "invalid"
            }
            aria-invalid={linkError !== undefined}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setTypedInput(e.target.value);
              setModeChoice(undefined);
              setUnselected([]);
            }}
          />
          {linkError && (
            <p role="alert" className="m-0 text-help text-danger">
              {linkError}
            </p>
          )}
          {channelSet && plan && (
            <div className="mt-2 flex flex-col gap-4">
              {!switching && (
                <div className="flex flex-col gap-2">
                  <Segmented
                    aria-label={t("import.mode")}
                    aria-describedby={modeHelpId}
                    options={[
                      {
                        value: "replace",
                        label: t("import.replace"),
                        disabled: !replaceAvailable,
                      },
                      { value: "add", label: t("import.add") },
                    ]}
                    value={mode}
                    onValueChange={setModeChoice}
                  />
                  <p id={modeHelpId} className="m-0 text-help text-secondary">
                    {mode === "replace"
                      ? t("import.replaceDescription")
                      : t("import.addDescription")}
                    {replaceAvailable ? "" : ` ${t("import.addOnly")}`}
                  </p>
                </div>
              )}

              <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1 text-sm font-semibold">
                  {t("import.channelsHeading")}
                </legend>
                {channelSet.settings.map((channel, from) => (
                  <div
                    className="flex flex-col gap-0.5"
                    key={`channel_${from}`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        className="flex-1"
                        checked={!unselected.includes(from)}
                        disabled={switching}
                        onChange={(on) => toggle(from, on)}
                      >
                        {channel.name || t("import.unnamed")}
                      </Checkbox>
                      <span className="text-help text-secondary">
                        {rowStatus(from)}
                      </span>
                    </div>
                    {mode === "add" && plan.nameConflicts.includes(from) && (
                      <p className="m-0 pl-9 text-help text-warning">
                        {t("import.nameConflict")}
                      </p>
                    )}
                  </div>
                ))}
              </fieldset>

              <output className="flex flex-col gap-1 text-help text-secondary">
                {!radioLoaded ? (
                  <span>{t("import.waitingForRadio")}</span>
                ) : nothingSelected ? (
                  <span>{t("import.selectOne")}</span>
                ) : mode === "add" && !switching ? (
                  <>
                    <span>
                      {t("import.freeSlots", { count: plan.freeSlots })}
                    </span>
                    {plan.alreadyOnRadio.length > 0 && (
                      <span>
                        {t("import.alreadyOnRadioCount", {
                          count: plan.alreadyOnRadio.length,
                        })}
                      </span>
                    )}
                    {plan.noSlot.length > 0 && (
                      <span className="text-danger">
                        {t("import.noSlotCount", {
                          count: plan.noSlot.length,
                        })}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {!switching && usedSlots > 0 && (
                      <span>{t("import.replaces", { count: usedSlots })}</span>
                    )}
                    <span>
                      {loraMissing
                        ? t("import.loraNotLoaded")
                        : t("import.loraApplied")}
                    </span>
                    {regionChange && (
                      <span className="text-warning">
                        {t("import.regionChange", {
                          from: regionChange.from,
                          to: regionChange.to,
                        })}
                      </span>
                    )}
                  </>
                )}
              </output>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={apply} disabled={!canApply} name="apply">
            {switching
              ? t("button.apply")
              : mode === "replace"
                ? t("import.confirmReplace")
                : t("import.confirmAdd")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
