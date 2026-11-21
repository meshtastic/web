import { Callout } from "@components/UI/Callout.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useActiveClient, useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import type { RadioConfig } from "@core/kmp/configEditor.ts";
import { parseRegion, regionChoices } from "@core/onboarding/region.ts";
import { buildProfileEdits, classifyCommit } from "@core/onboarding/saves.ts";
import type { ConnectionStatus } from "@core/stores/deviceStore/types.ts";
import {
  isProfileValid,
  LONG_NAME_LIMIT,
  type NameError,
  type ProfileErrors,
  SHORT_NAME_LIMIT,
  validateProfile,
} from "@core/onboarding/validation.ts";
import { Protobuf } from "@core/protobuf.ts";
import { firmwareAtLeast } from "@core/utils/firmware.ts";
import {
  getAllowedRegions,
  getDefaultPreset,
  getLicensedOnlyRegions,
} from "@core/utils/loraPresets.ts";
import { Result } from "better-result";
import { type FormEvent, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const NO_RADIO = constantSignal<RadioConfig>({});
const NO_PRESETS = constantSignal<
  Protobuf.Mesh.LoRaRegionPresetMap | undefined
>(undefined);
const NO_METADATA = constantSignal<Protobuf.Mesh.DeviceMetadata | undefined>(
  undefined,
);

/** Region presets and firmware level, read from the session only. */
function useLoRaCapabilities() {
  const client = useActiveClient();
  const regionPresets = useSignal(client?.device.regionPresets ?? NO_PRESETS);
  const metadata = useSignal(client?.device.metadata ?? NO_METADATA);
  return {
    regionPresets,
    supportsFirmware28:
      regionPresets !== undefined ||
      firmwareAtLeast(metadata?.firmwareVersion ?? "", "2.8.0"),
  };
}

export interface ProfileStepProps {
  actions: StepActionsProps;
  formId: string;
  /** The radio is connected and configured (not restarting). */
  radioReady: boolean;
  /** The connection's status right now, read after a commit. */
  statusNow: () => ConnectionStatus | undefined;
  /** `restarting` when the save changed LoRa and the radio restarts. */
  onSaved: (restarting: boolean) => void;
}

/**
 * Long and short name plus the LoRa region, saved through the config
 * editor the Settings User and LoRa sections use.
 */
export const ProfileStep = ({
  actions,
  formId,
  radioReady,
  statusNow,
  onSaved,
}: ProfileStepProps) => {
  const { t } = useTranslation("onboarding");
  const editor = useConfigEditor();
  const myNode = useMyNodeAsProto();
  const radio = useSignal(editor?.radio ?? NO_RADIO);
  const caps = useLoRaCapabilities();
  const { regionPresets, supportsFirmware28 } = caps;
  const choices = useMemo(
    () =>
      regionChoices(
        getAllowedRegions({ regionPresets, supportsFirmware28 }),
        getLicensedOnlyRegions(regionPresets),
      ),
    [regionPresets, supportsFirmware28],
  );

  const user = myNode?.user;
  const [longName, setLongName] = useState<string>();
  const [shortName, setShortName] = useState<string>();
  const [region, setRegion] = useState<string>();
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  // Untouched fields follow what the radio reports.
  const values = {
    longName: longName ?? user?.longName ?? "",
    shortName: shortName ?? user?.shortName ?? "",
  };
  const currentRegion = radio.lora?.region;
  const regionValue =
    region ??
    (currentRegion !== undefined && currentRegion !== Region.UNSET
      ? String(currentRegion)
      : undefined);
  const pickedRegion =
    regionValue === undefined ? undefined : parseRegion(regionValue, choices);
  const regionUnset =
    pickedRegion === undefined &&
    (currentRegion === undefined || currentRegion === Region.UNSET);
  const regionChanges =
    pickedRegion !== undefined && pickedRegion !== currentRegion;
  // A radio without a region doesn't transmit, so one has to be chosen.
  const regionRequired = regionUnset;
  const regionRef = useRef<HTMLButtonElement>(null);
  const regionErrorId = useId();
  const showRegionError = showErrors && regionRequired;
  // Saving needs the radio's whole LoRa section, which a restart clears.
  const canSave =
    editor !== undefined &&
    user !== undefined &&
    radioReady &&
    radio.lora !== undefined;

  const errors: ProfileErrors = validateProfile(values);
  const visibleErrors: ProfileErrors = showErrors ? errors : {};

  const longId = useId();
  const shortId = useId();
  const shortHelpId = useId();
  const longErrorId = useId();
  const shortErrorId = useId();
  const regionId = useId();

  const errorText = (error: NameError | undefined, tooLong: string) =>
    error === "required"
      ? t("profile.required")
      : error === "tooLong"
        ? tooLong
        : "";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !editor) return;
    setShowErrors(true);
    if (!isProfileValid(errors)) return;
    if (regionRequired) {
      regionRef.current?.focus();
      return;
    }
    const edits = buildProfileEdits({
      user,
      longName: values.longName,
      shortName: values.shortName,
      currentLora: radio.lora,
      region: pickedRegion,
      defaultPreset:
        pickedRegion === undefined
          ? undefined
          : getDefaultPreset(regionPresets, pickedRegion),
    });
    if (Result.isError(edits)) {
      setSaveError(t("profile.loraNotLoaded"));
      return;
    }
    const { owner, lora, restartExpected } = edits.value;
    setSaving(true);
    setSaveError(undefined);
    if (user) editor.setBaselineOwner(user);
    if (owner) editor.setOwner(owner);
    if (lora) editor.setRadioSection("lora", lora);
    const result = await editor.commit();
    const outcome = classifyCommit(result, {
      restartExpected,
      statusAfter: statusNow(),
    });
    setSaving(false);
    if (outcome === "failed") {
      // Don't leave the edits staged for Settings' unsaved-changes bar.
      editor.reset();
      setSaveError(
        Result.isError(result)
          ? result.error.message
          : t("profile.unknownError"),
      );
      return;
    }
    onSaved(outcome === "savedRestarting");
  };

  return (
    <StepShell
      actions={{
        ...actions,
        next: actions.next && {
          ...actions.next,
          label: saving ? t("actions.saving") : actions.next.label,
          form: formId,
          disabled: saving || !canSave,
        },
      }}
    >
      <StepHeading>{t("profile.title")}</StepHeading>
      <StepBody>{t("profile.body")}</StepBody>
      <form
        id={formId}
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
      >
        {!canSave ? (
          <output className="block text-help text-muted">
            {t("profile.waiting")}
          </output>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
            <Label htmlFor={longId} className="text-help font-medium">
              {t("profile.longName")}
            </Label>
            <Input
              id={longId}
              value={values.longName}
              limit={LONG_NAME_LIMIT}
              onChange={(event) => setLongName(event.target.value)}
              aria-invalid={visibleErrors.longName !== undefined}
              aria-describedby={longErrorId}
              autoComplete="off"
              className="h-11 text-header"
            />
            <p
              id={longErrorId}
              aria-live="polite"
              className="text-help text-danger empty:hidden"
            >
              {errorText(visibleErrors.longName, t("profile.longNameTooLong"))}
            </p>
          </div>
          <div className="flex min-w-0 flex-[0_1_160px] flex-col gap-1.5">
            <Label htmlFor={shortId} className="text-help font-medium">
              {t("profile.shortName")}
            </Label>
            <Input
              id={shortId}
              value={values.shortName}
              limit={SHORT_NAME_LIMIT}
              onChange={(event) => setShortName(event.target.value)}
              aria-invalid={visibleErrors.shortName !== undefined}
              aria-describedby={`${shortHelpId} ${shortErrorId}`}
              autoComplete="off"
              className="h-11 text-header"
            />
            <p id={shortHelpId} className="text-meta text-muted">
              {t("profile.shortNameHelp")}
            </p>
            <p
              id={shortErrorId}
              aria-live="polite"
              className="text-help text-danger empty:hidden"
            >
              {errorText(
                visibleErrors.shortName,
                t("profile.shortNameTooLong"),
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={regionId} className="text-help font-medium">
            {t("profile.region")}
          </Label>
          <Select value={regionValue} onValueChange={setRegion}>
            <SelectTrigger
              id={regionId}
              ref={regionRef}
              aria-invalid={showRegionError}
              aria-describedby={showRegionError ? regionErrorId : undefined}
              className={regionUnset ? "h-11 border-accent" : "h-11"}
            >
              <SelectValue placeholder={t("profile.regionPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {choices.map((choice) => (
                <SelectItem key={choice.value} value={String(choice.value)}>
                  {choice.licensedOnly
                    ? `${choice.code} ${t("config:lora.region.licensedOnlySuffix")}`
                    : choice.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p
          id={regionErrorId}
          aria-live="polite"
          className="text-help text-danger empty:hidden"
        >
          {showRegionError ? t("profile.regionRequired") : ""}
        </p>
        {regionUnset ? (
          <Callout tone="warning">{t("profile.regionUnset")}</Callout>
        ) : regionChanges ? (
          <Callout tone="info">{t("profile.regionRestart")}</Callout>
        ) : null}
        <p role="alert" className="text-help text-danger empty:hidden">
          {saveError ? t("profile.saveFailed", { message: saveError }) : ""}
        </p>
      </form>
    </StepShell>
  );
};
