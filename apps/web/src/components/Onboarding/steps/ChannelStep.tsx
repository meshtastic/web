import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import type { RadioConfig } from "@core/kmp/configEditor.ts";
import { useChannels, useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import {
  type ChannelImportMode,
  isDefaultPublicChannel,
  parseChannelLink,
  planChannelImport,
} from "@core/onboarding/channelImport.ts";
import {
  buildChannelEdits,
  classifyCommit,
  replaceRegionChange,
} from "@core/onboarding/saves.ts";
import type { ConnectionStatus } from "@core/stores/deviceStore/types.ts";
import { channelSettingsByIndex } from "@core/utils/beaconJoin.ts";
import { Result } from "better-result";
import { type FormEvent, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

const NO_RADIO = constantSignal<RadioConfig>({});

export interface ChannelStepProps {
  actions: StepActionsProps;
  formId: string;
  /** The radio is connected and configured (not restarting). */
  radioReady: boolean;
  /** The connection's status right now, read after a commit. */
  statusNow: () => ConnectionStatus | undefined;
  /** `restarting` when the save changed LoRa and the radio restarts. */
  onDone: (restarting: boolean) => void;
}

/**
 * Join a group's channel from a share link, with the import dialog's
 * add-or-replace choice. Scanning a QR code needs a decoder the app
 * doesn't have, so only links are accepted.
 */
export const ChannelStep = ({
  actions,
  formId,
  radioReady,
  statusNow,
  onDone,
}: ChannelStepProps) => {
  const { t } = useTranslation("onboarding");
  const editor = useConfigEditor();
  const channels = useChannels();
  const current = useMemo(() => channelSettingsByIndex(channels), [channels]);
  const primary = current[0];
  const isDefault = isDefaultPublicChannel(primary);

  const [link, setLink] = useState("");
  const [mode, setMode] = useState<ChannelImportMode>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const radio = useSignal(editor?.radio ?? NO_RADIO);

  const parsed = parseChannelLink(link);
  const channelSet = Result.isOk(parsed) ? parsed.value : undefined;
  // Adding is the default: replacing drops the channels the radio has.
  const effectiveMode: ChannelImportMode = mode ?? "add";
  const plan = channelSet
    ? planChannelImport(channelSet, current, effectiveMode)
    : undefined;
  const nothingToAdd = plan !== undefined && plan.assignments.length === 0;
  const regionChange =
    channelSet && effectiveMode === "replace"
      ? replaceRegionChange(radio.lora, channelSet)
      : undefined;

  const linkId = useId();
  const linkHelpId = useId();
  const modeName = useId();

  const linkMessage = (() => {
    if (Result.isOk(parsed)) {
      const names = parsed.value.settings
        .map((s) => s.name || t("channel.unnamed"))
        .join(", ");
      return t("channel.linkChannels", {
        count: parsed.value.settings.length,
        names,
      });
    }
    if (parsed.error === "invalid") return t("channel.linkInvalid");
    if (parsed.error === "noChannels") return t("channel.linkNoChannels");
    return "";
  })();
  const linkHasError = Result.isError(parsed) && parsed.error !== "empty";

  const save = async () => {
    if (!editor || !channelSet || !plan) return;
    const edits = buildChannelEdits(channelSet, plan, radio.lora);
    if (Result.isError(edits)) {
      setSaveError(t("channel.loraNotLoaded"));
      return;
    }
    const { channels: messages, lora, restartExpected } = edits.value;
    setSaving(true);
    setSaveError(undefined);
    for (const channel of messages) editor.setChannel(channel);
    if (lora) editor.setRadioSection("lora", lora);
    const result = await editor.commit();
    const outcome = classifyCommit(result, {
      restartExpected,
      statusAfter: statusNow(),
    });
    setSaving(false);
    setConfirming(false);
    if (outcome === "failed") {
      // Don't leave the edits staged for Settings' unsaved-changes bar.
      editor.reset();
      setSaveError(
        Result.isError(result)
          ? result.error.message
          : t("channel.unknownError"),
      );
      return;
    }
    onDone(outcome === "savedRestarting");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || !plan || nothingToAdd || saving) return;
    // A replace restarts the radio and may change its region: say so first.
    if (effectiveMode === "replace" && !confirming) {
      setConfirming(true);
      return;
    }
    void save();
  };

  return (
    <StepShell
      actions={{
        ...actions,
        next: actions.next && {
          ...actions.next,
          label: saving
            ? t("actions.saving")
            : confirming
              ? t("channel.confirmReplace")
              : actions.next.label,
          form: formId,
          disabled:
            saving ||
            !radioReady ||
            !editor ||
            radio.lora === undefined ||
            !plan ||
            nothingToAdd,
        },
        secondary: actions.secondary && {
          ...actions.secondary,
          disabled: saving,
        },
      }}
    >
      <StepHeading>{t("channel.title")}</StepHeading>
      <StepBody>
        {isDefault ? t("channel.body") : t("channel.bodyCustom")}
      </StepBody>
      <div className="flex items-center gap-3 rounded-card border border-subtle bg-chat px-3.5 py-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-control bg-accent-tint font-bold text-accent"
        >
          #
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-header font-semibold text-primary">
            {primary?.name || t("channel.primary")}
          </span>
          <span className="text-meta text-muted">
            {isDefault ? t("channel.defaultPublic") : t("channel.current")}
          </span>
        </span>
      </div>
      <form
        id={formId}
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={linkId} className="text-help font-medium">
            {t("channel.link")}
          </Label>
          <Input
            id={linkId}
            type="url"
            value={link}
            placeholder={t("channel.linkPlaceholder")}
            onChange={(event) => {
              setLink(event.target.value);
              setConfirming(false);
            }}
            variant={linkHasError ? "invalid" : "default"}
            aria-invalid={linkHasError}
            aria-describedby={linkHelpId}
            autoComplete="off"
            spellCheck={false}
            className="h-11 text-header"
          />
          <p
            id={linkHelpId}
            aria-live="polite"
            className={
              linkHasError ? "text-help text-danger" : "text-help text-muted"
            }
          >
            {linkMessage || t("channel.linkEmpty")}
          </p>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-help font-medium">
            {t("channel.mode")}
          </legend>
          <label className="flex items-center gap-2 text-body">
            <input
              type="radio"
              name={modeName}
              checked={effectiveMode === "add"}
              onChange={() => {
                setMode("add");
                setConfirming(false);
              }}
              className="size-4 accent-[var(--mt-accent)]"
            />
            {t("channel.modeAdd")}
          </label>
          <label className="flex flex-wrap items-center gap-2 text-body">
            <input
              type="radio"
              name={modeName}
              checked={effectiveMode === "replace"}
              onChange={() => {
                setMode("replace");
                setConfirming(false);
              }}
              className="size-4 accent-[var(--mt-accent)]"
            />
            {t("channel.modeReplace")}
            <span className="text-help text-muted">
              {t("channel.modeReplaceNote")}
            </span>
          </label>
        </fieldset>
        {confirming && channelSet ? (
          <Callout tone="warning" title={t("channel.confirmTitle")}>
            <div className="flex flex-col gap-2">
              {regionChange ? (
                <p>
                  {t("channel.confirmRegion", {
                    from: regionChange.from,
                    to: regionChange.to,
                  })}
                </p>
              ) : null}
              <p>{t("channel.confirmRestart")}</p>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setConfirming(false)}
              >
                {t("channel.keepChannels")}
              </Button>
            </div>
          </Callout>
        ) : null}
        {nothingToAdd ? (
          <output className="block text-help text-secondary">
            {t("channel.nothingToAdd")}
          </output>
        ) : plan && plan.skipped > 0 ? (
          <output className="block text-help text-secondary">
            {t("channel.skipped", { count: plan.skipped })}
          </output>
        ) : null}
        {!radioReady ? (
          <output className="block text-help text-muted">
            {t("channel.reconnecting")}
          </output>
        ) : null}
        <p role="alert" className="text-help text-danger empty:hidden">
          {saveError ? t("channel.saveFailed", { message: saveError }) : ""}
        </p>
      </form>
    </StepShell>
  );
};
