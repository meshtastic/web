import { Callout } from "@components/UI/Callout.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import type { RadioConfig } from "@core/kmp/configEditor.ts";
import { useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import {
  planRestore,
  regionUnsetAfter,
  type RestoreNote,
  restoreNotes,
  restoreRestarts,
  restoreRows,
} from "@core/onboarding/restore.ts";
import { classifyCommit, type SaveOutcome } from "@core/onboarding/saves.ts";
import type { RestoreChoice } from "@core/onboarding/wizard.ts";
import { Protobuf } from "@core/protobuf.ts";
import type { ConnectionStatus } from "@core/stores/deviceStore/types.ts";
import { cn } from "@core/utils/cn.ts";
import {
  anyFieldSelected,
  decodeDeviceProfile,
  defaultSelection,
  type ProfileField,
  type ProfileSelection,
  profileContents,
} from "@core/utils/profileExport.ts";
import { importTarget, stageImportPlan } from "@core/utils/profileImport.ts";
import { Result } from "better-result";
import {
  ArchiveRestoreIcon,
  FileIcon,
  type LucideIcon,
  SparklesIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  StepBody,
  StepHeading,
  StepShell,
  type StepActionsProps,
} from "../StepLayout.tsx";

type DeviceProfile = Protobuf.ClientOnly.DeviceProfile;

const NO_RADIO = constantSignal<RadioConfig>({});
const NO_CHANNELS = constantSignal<
  ReadonlyMap<number, Protobuf.Channel.Channel>
>(new Map());
const NO_OWNER = constantSignal<Protobuf.Mesh.User | undefined>(undefined);

const FIELD_LABEL = {
  longName: "restore.fieldLongName",
  shortName: "restore.fieldShortName",
  channelUrl: "restore.fieldChannels",
  config: "restore.fieldConfig",
  moduleConfig: "restore.fieldModuleConfig",
  fixedPosition: "restore.fieldFixedPosition",
  isUnmessagable: "restore.fieldUnmessagable",
  isLicensed: "restore.fieldLicensed",
  privateKey: "restore.fieldPrivateKey",
} as const satisfies Record<ProfileField, string>;

const NOTE_TEXT = {
  owner: "restore.noteOwner",
  isLicensed: "restore.noteLicensed",
  security: "restore.noteSecurity",
  trafficManagement: "restore.noteTrafficManagement",
  ringtone: "restore.noteRingtone",
  cannedMessages: "restore.noteCannedMessages",
  keysKept: "restore.noteKeysKept",
} as const satisfies Record<RestoreNote, string>;

const CHOICES = [
  {
    choice: "new",
    title: "restore.newTitle",
    body: "restore.newBody",
    icon: SparklesIcon,
  },
  {
    choice: "restore",
    title: "restore.restoreTitle",
    body: "restore.restoreBody",
    icon: ArchiveRestoreIcon,
  },
] as const satisfies ReadonlyArray<{
  choice: RestoreChoice;
  title: string;
  body: string;
  icon: LucideIcon;
}>;

interface LoadedFile {
  readonly name: string;
  readonly profile: DeviceProfile;
  readonly available: ProfileSelection;
  readonly selection: ProfileSelection;
}

export type RestoreView =
  | { readonly view: "choose"; readonly choice: RestoreChoice }
  | { readonly view: "review" };

export interface RestoreStepProps {
  actions: StepActionsProps;
  formId: string;
  view: RestoreView;
  onSelectChoice: (choice: RestoreChoice) => void;
  /** A backup file was read: show what it holds. */
  onFileLoaded: () => void;
  /** The radio is connected and configured (not restarting). */
  radioReady: boolean;
  /** The connection's status right now, read after a commit. */
  statusNow: () => ConnectionStatus | undefined;
  /** The restore was written; `regionUnset` when the radio has no region. */
  onRestored: (
    outcome: Exclude<SaveOutcome, "failed">,
    regionUnset: boolean,
  ) => void;
}

/**
 * Set up as new, or restore a `.cfg` backup: the Settings import, written
 * in one go. The file replaces the radio's settings, LoRa included.
 */
export const RestoreStep = ({
  actions,
  formId,
  view,
  onSelectChoice,
  onFileLoaded,
  radioReady,
  statusNow,
  onRestored,
}: RestoreStepProps) => {
  const { t } = useTranslation("onboarding");
  const editor = useConfigEditor();
  const myNode = useMyNodeAsProto();
  const radio = useSignal(editor?.radio ?? NO_RADIO);
  const channels = useSignal(editor?.channels ?? NO_CHANNELS);
  const owner = useSignal(editor?.owner ?? NO_OWNER);
  const fileInput = useRef<HTMLInputElement>(null);
  const groupName = useId();
  const fileInputId = useId();

  const [loaded, setLoaded] = useState<LoadedFile>();
  const [fileError, setFileError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const pickFile = () => fileInput.current?.click();

  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Picking the same file again after an error still fires a change.
    event.target.value = "";
    if (!file) return;
    const decoded = decodeDeviceProfile(
      new Uint8Array(await file.arrayBuffer()),
    );
    if (Result.isError(decoded)) {
      setFileError(file.name);
      return;
    }
    setFileError(undefined);
    setSaveError(undefined);
    setLoaded({
      name: file.name,
      profile: decoded.value,
      available: profileContents(decoded.value),
      selection: defaultSelection(decoded.value),
    });
    onFileLoaded();
  };

  const reviewing = view.view === "review" ? loaded : undefined;
  const target = importTarget({
    owner: owner ?? myNode?.user,
    security: radio.security,
    channels: channels.values(),
  });
  const plan = reviewing
    ? planRestore(reviewing.profile, reviewing.selection, target)
    : undefined;
  const rows = reviewing
    ? restoreRows(reviewing.available, reviewing.selection)
    : [];
  const notes =
    reviewing && plan && Result.isOk(plan)
      ? restoreNotes(reviewing.profile, reviewing.selection, plan.value)
      : [];
  const restarts =
    plan !== undefined && Result.isOk(plan)
      ? restoreRestarts(plan.value)
      : false;
  const canRestore =
    editor !== undefined &&
    radioReady &&
    plan !== undefined &&
    Result.isOk(plan) &&
    anyFieldSelected(rows);

  const toggle = (field: ProfileField, checked: boolean) =>
    setLoaded(
      (current) =>
        current && {
          ...current,
          selection: { ...current.selection, [field]: checked },
        },
    );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || !reviewing || !canRestore || saving) return;
    // The User page loads the owner into the editor only when opened.
    const nodeUser = myNode?.user;
    if (!editor.owner.peek() && nodeUser) editor.setBaselineOwner(nodeUser);
    const staged = planRestore(
      reviewing.profile,
      reviewing.selection,
      importTarget({
        owner: editor.owner.peek() ?? nodeUser,
        security: editor.radio.peek().security,
        channels: editor.channels.peek().values(),
      }),
    );
    if (Result.isError(staged)) {
      setSaveError(t("restore.invalidChannels"));
      return;
    }
    const restartExpected = restoreRestarts(staged.value);
    const regionUnset = regionUnsetAfter(
      staged.value,
      editor.radio.peek().lora,
    );
    setSaving(true);
    setSaveError(undefined);
    stageImportPlan(editor, staged.value);
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
          : t("restore.unknownError"),
      );
      return;
    }
    onRestored(outcome, regionUnset);
  };

  const fileErrorCallout = fileError ? (
    <Callout tone="danger" title={t("restore.fileInvalidTitle")}>
      {t("restore.fileInvalid", { name: fileError })}
    </Callout>
  ) : null;

  const hiddenInput = (
    <input
      ref={fileInput}
      id={fileInputId}
      type="file"
      accept=".cfg"
      tabIndex={-1}
      aria-label={t("restore.fileInput")}
      className="sr-only"
      onChange={(event) => void onFileChosen(event)}
    />
  );

  if (view.view === "choose" || !reviewing) {
    const choice = view.view === "choose" ? view.choice : "restore";
    return (
      <StepShell
        actions={{
          ...actions,
          next: actions.next && {
            ...actions.next,
            onClick: choice === "restore" ? pickFile : actions.next.onClick,
          },
        }}
      >
        <StepHeading key="choose">{t("restore.title")}</StepHeading>
        <StepBody>{t("restore.body")}</StepBody>
        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">{t("restore.choiceGroup")}</legend>
          {CHOICES.map((option) => {
            const checked = option.choice === choice;
            const Icon = option.icon;
            return (
              <OptionCard
                key={option.choice}
                checked={checked}
                icon={<Icon className="size-5" />}
                title={t(option.title)}
                body={t(option.body)}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={option.choice}
                  checked={checked}
                  onChange={() => {
                    setFileError(undefined);
                    onSelectChoice(option.choice);
                  }}
                  className="sr-only"
                />
              </OptionCard>
            );
          })}
        </fieldset>
        {hiddenInput}
        <div aria-live="polite" className="empty:hidden">
          {fileErrorCallout}
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      actions={{
        ...actions,
        secondary: actions.secondary && {
          ...actions.secondary,
          onClick: pickFile,
          disabled: saving,
        },
        next: actions.next && {
          ...actions.next,
          label: saving ? t("restore.restoring") : actions.next.label,
          form: formId,
          disabled: saving || !canRestore,
        },
        back: actions.back && { ...actions.back, disabled: saving },
      }}
    >
      <StepHeading key="review">{t("restore.reviewTitle")}</StepHeading>
      <StepBody>{t("restore.reviewBody")}</StepBody>
      <form
        id={formId}
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-3 rounded-panel border border-subtle bg-chat p-4">
          <p className="flex min-w-0 items-center gap-2 text-header font-semibold text-primary">
            <FileIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-accent"
            />
            <span className="min-w-0 truncate">{reviewing.name}</span>
          </p>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-help text-secondary">
              {t("restore.fieldsLegend")}
            </legend>
            {rows.map(({ field, enabled, checked }) => (
              <div key={field} className="flex flex-col gap-1">
                <Checkbox
                  checked={checked}
                  disabled={!enabled}
                  onChange={(next) => toggle(field, next)}
                  className="text-body text-primary"
                >
                  {t(FIELD_LABEL[field])}
                </Checkbox>
                {field === "privateKey" && checked ? (
                  <p className="ml-9 text-help text-warning">
                    {t("restore.privateKeyWarning")}
                  </p>
                ) : null}
              </div>
            ))}
          </fieldset>
          {notes.length > 0 ? (
            <div className="flex flex-col gap-1 border-t border-subtle pt-3 text-help text-muted">
              <span>{t("restore.notesTitle")}</span>
              <ul className="list-disc pl-5">
                {notes.map((note) => (
                  <li key={note}>{t(NOTE_TEXT[note])}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {plan && Result.isError(plan) ? (
          <Callout tone="danger">{t("restore.invalidChannels")}</Callout>
        ) : (
          <Callout tone="warning">
            {t(restarts ? "restore.replaceWarning" : "restore.replaceNames")}
          </Callout>
        )}
        {!radioReady ? (
          <output className="block text-help text-muted">
            {t("restore.waiting")}
          </output>
        ) : null}
        {hiddenInput}
        <div aria-live="polite" className="empty:hidden">
          {fileErrorCallout}
        </div>
        <p role="alert" className="text-help text-danger empty:hidden">
          {saveError ? t("restore.saveFailed", { message: saveError }) : ""}
        </p>
      </form>
    </StepShell>
  );
};

interface OptionCardProps {
  checked: boolean;
  icon: ReactNode;
  title: string;
  body: string;
  /** The visually hidden radio input. */
  children: ReactNode;
}

/** A radio card like the connect step's method cards. */
const OptionCard = ({
  checked,
  icon,
  title,
  body,
  children,
}: OptionCardProps) => (
  <label
    className={cn(
      "flex cursor-pointer items-center gap-3.5 rounded-panel border-2 px-4 py-3.5 transition-colors hover:bg-selected",
      "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
      checked ? "border-accent bg-accent-tint" : "border-control bg-chat",
    )}
  >
    {children}
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-control bg-raised text-accent"
    >
      {icon}
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-header font-semibold text-primary">{title}</span>
      <span className="text-help text-muted">{body}</span>
    </span>
    <span
      aria-hidden="true"
      className={cn(
        "size-[18px] shrink-0 rounded-full border-2",
        checked ? "border-accent bg-accent" : "border-input",
      )}
    />
  </label>
);
