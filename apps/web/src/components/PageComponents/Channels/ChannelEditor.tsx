import {
  CHANNEL_NAME_MAX_BYTES,
  type ChannelForm,
  ChannelFormSchema,
} from "@app/validation/channel.ts";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import { SettingsCard } from "@components/Settings/SettingsCard.tsx";
import {
  READ_ONLY_INLINE_CLASS,
  READ_ONLY_ROWS_CLASS,
  ReadOnlyFieldset,
} from "@components/Settings/SettingsReadOnly.tsx";
import { SettingsFieldRow } from "@components/Settings/SettingsFieldRow.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { Input } from "@components/UI/Input.tsx";
import {
  SettingRow,
  settingRowDescribedBy,
} from "@components/UI/SettingRow.tsx";
import { isChannelMuted } from "@core/channels/mute.ts";
import type { ConfigEditor } from "@core/kmp/configEditor.ts";
import { Protobuf } from "@core/protobuf.ts";
import { MASKED_KEY } from "@core/settings/securityKeys.ts";
import { useEffect, useState } from "react";
import { get, type UseFormReturn, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  KEY_KINDS,
  type KeyKind,
  keyKindOf,
  PRECISION_CHOICES,
  pskForKind,
  regeneratedPsk,
  type SlotRole,
  slotRole,
  withMuted,
} from "./channelSlots.ts";
import {
  applyChannelNameEdit,
  buildDisabledChannel,
  buildEditedChannel,
  buildNewChannel,
  draftFromChannel,
  EXISTING_CHANNEL_PSK_STATE,
  generatePsk,
  markPskEdited,
  NEW_CHANNEL_PSK_STATE,
  type PskEditState,
  precisionLabelKey,
  securityState,
} from "./channelStaging.ts";

type ChannelLike = Pick<Protobuf.Channel.Channel, "index" | "role"> & {
  settings?: Protobuf.Channel.ChannelSettings;
};

const TEXT_BUTTON = "text-help";

/**
 * A button label that keeps the width of the wider of two labels, so
 * toggling between them (Show/Hide) doesn't move what follows.
 */
const StableLabel = ({ label, other }: { label: string; other: string }) => (
  <span className="inline-grid">
    <span className="col-start-1 row-start-1">{label}</span>
    <span aria-hidden="true" className="invisible col-start-1 row-start-1">
      {other}
    </span>
  </span>
);

function toForm(index: number, channel: ChannelLike | undefined): ChannelForm {
  const source = channel ?? {
    index,
    role: Protobuf.Channel.Channel_Role.DISABLED,
  };
  return {
    ...draftFromChannel(source),
    isMuted: isChannelMuted(source),
  };
}

export interface ChannelEditorProps {
  index: number;
  /** The editor's working copy of this slot. */
  working: ChannelLike | undefined;
  /** The slot as it is on the radio; edits differing from it are amber. */
  device: ChannelLike | undefined;
  editor: Pick<ConfigEditor, "setChannel">;
  /** The name shown for an unnamed channel. */
  defaultName: string;
  metric: boolean;
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
  /** Whether the form holds edits that fail validation (and are unstaged). */
  onInvalidChange?: (invalid: boolean) => void;
}

/**
 * The inline editor for one channel slot. Every valid change is staged in
 * the config editor straight away and sent with the page's Save; an invalid
 * name or key marks the form invalid, which blocks Save.
 */
export const ChannelEditor = ({
  index,
  working,
  device,
  editor,
  defaultName,
  metric,
  onFormInit,
  onInvalidChange,
}: ChannelEditorProps) => {
  const { t } = useTranslation("channels");
  const form = useForm<ChannelForm>({
    mode: "onChange",
    defaultValues: toForm(index, device),
    values: toForm(index, working),
    resetOptions: { keepDefaultValues: true },
    resolver: createZodResolver(ChannelFormSchema),
  });
  const { control, getValues, setValue, getFieldState, formState } = form;
  const values = useWatch({ control });

  useEffect(() => {
    onFormInit(form);
  }, [onFormInit, form]);

  const invalid = Object.keys(formState.errors).length > 0;
  useEffect(() => {
    onInvalidChange?.(invalid);
  }, [onInvalidChange, invalid]);

  // A channel not on the radio yet is new: naming it may generate a key.
  const [pskState, setPskState] = useState<PskEditState>(() =>
    slotRole(device) === "disabled"
      ? NEW_CHANNEL_PSK_STATE
      : EXISTING_CHANNEL_PSK_STATE,
  );
  const [showKey, setShowKey] = useState(false);
  const [editingKey, setEditingKey] = useState(false);

  const role = slotRole(working);
  const name = values.name ?? "";
  const psk = values.psk ?? "";
  const kind = keyKindOf(psk);
  const precision = values.positionPrecision ?? 0;

  const stage = () => {
    const next = getValues();
    if (!working || !ChannelFormSchema.safeParse(next).success) return;
    editor.setChannel(
      withMuted(buildEditedChannel(working, next), next.isMuted),
    );
  };

  const opts = { shouldDirty: true, shouldValidate: true } as const;

  const setPsk = (value: string) => {
    setValue("psk", value, opts);
    setPskState(markPskEdited);
    stage();
  };

  const onNameChange = (input: string) => {
    const result = applyChannelNameEdit({ ...getValues() }, input, pskState);
    setValue("name", result.draft.name, opts);
    if (result.draft.psk !== getValues("psk")) {
      setValue("psk", result.draft.psk, opts);
    }
    setPskState(result.state);
    stage();
  };

  const onRoleChange = (next: SlotRole) => {
    if (next === role) return;
    if (next === "disabled") {
      editor.setChannel(buildDisabledChannel(index));
      return;
    }
    if (next === "secondary") {
      setPskState(NEW_CHANNEL_PSK_STATE);
      editor.setChannel(buildNewChannel(index, generatePsk()));
    }
  };

  const errorText = (field: keyof ChannelForm): string | undefined => {
    const error = get(formState.errors, field);
    if (!error) return undefined;
    const message = String(error.message);
    if (message.startsWith("formValidation.pskLength")) {
      return t("validation.pskAnyLength");
    }
    return String(
      t([`formValidation.${error.type}`, message], {
        ns: "common",
        ...error.params,
      }),
    );
  };

  const roleOptions =
    index === 0
      ? [{ value: "primary" as const, label: t("slots.role.primary") }]
      : [
          { value: "secondary" as const, label: t("slots.role.secondary") },
          { value: "disabled" as const, label: t("slots.role.disabled") },
        ];
  const roleRow = (
    <SettingRow<SlotRole>
      kind="segmented"
      label={t("editor.role.label")}
      help={
        role === "disabled" ? t("editor.disabledHelp") : t("editor.role.help")
      }
      value={role}
      options={roleOptions}
      dirty={slotRole(device) !== role}
      onValueChange={onRoleChange}
    />
  );

  const title = t("editor.title", {
    index,
    name: name.trim() || defaultName,
  });

  if (role === "disabled") {
    return (
      <SettingsCard title={title}>
        <ReadOnlyFieldset className={READ_ONLY_ROWS_CLASS}>
          {roleRow}
        </ReadOnlyFieldset>
      </SettingsCard>
    );
  }

  const kindOptions = KEY_KINDS.map((value) => ({
    value,
    label: t(`slots.keyKind.${value}`),
  }));
  const precisionOptions = PRECISION_CHOICES.map((value) => ({
    value: String(value),
    label:
      value === 0
        ? t("editor.precision.off")
        : value === 32
          ? t("editor.precision.precise")
          : t(precisionLabelKey(value, metric)),
  }));
  const security = securityState(working?.settings);
  const keyDirty = getFieldState("psk").isDirty;
  const keyId = `channel-${index}-key`;

  return (
    <>
      <SettingsCard title={title}>
        <ReadOnlyFieldset className={READ_ONLY_ROWS_CLASS}>
          <SettingRow
            kind="text"
            label={t("editor.name.label")}
            help={t("editor.name.help")}
            value={name}
            placeholder={defaultName}
            limit={{ max: CHANNEL_NAME_MAX_BYTES, mode: "bytes", trim: true }}
            width="lg"
            dirty={getFieldState("name").isDirty}
            error={errorText("name")}
            onValueChange={onNameChange}
          />
          {roleRow}
          <SettingRow<KeyKind | "">
            kind="select"
            label={t("editor.encryption.label")}
            help={t("editor.encryption.help")}
            value={kind ?? ""}
            placeholder={t("slots.keyKind.custom")}
            options={kindOptions}
            dirty={keyDirty}
            onValueChange={(next) => {
              if (next !== "") setPsk(pskForKind(next));
            }}
          />
        </ReadOnlyFieldset>
        {kind === "none" ? null : editingKey ? (
          <SettingsFieldRow
            label={t("editor.key.label")}
            htmlFor={keyId}
            help={t("editor.key.help")}
            error={errorText("psk")}
            dirty={keyDirty}
          >
            <ReadOnlyFieldset className={READ_ONLY_INLINE_CLASS}>
              <Input
                id={keyId}
                className="font-mono"
                containerClassName="min-w-0 flex-[1_1_16rem]"
                autoComplete="off"
                spellCheck={false}
                value={psk}
                aria-invalid={errorText("psk") ? true : undefined}
                aria-describedby={settingRowDescribedBy(keyId, {
                  help: true,
                  error: Boolean(errorText("psk")),
                })}
                variant={
                  errorText("psk") ? "invalid" : keyDirty ? "dirty" : "default"
                }
                onChange={(event) => setPsk(event.target.value)}
              />
              <Button
                variant="secondary"
                className={TEXT_BUTTON}
                onClick={() => setEditingKey(false)}
              >
                {t("editor.key.done")}
              </Button>
            </ReadOnlyFieldset>
          </SettingsFieldRow>
        ) : (
          <SettingRow
            kind="readonlyKey"
            label={t("editor.key.label")}
            help={t("editor.key.help")}
            value={showKey ? psk : MASKED_KEY}
            copyValue={psk}
            fill
            dirty={keyDirty}
            error={errorText("psk")}
            actions={
              <>
                <Button
                  variant="secondary"
                  className={TEXT_BUTTON}
                  aria-pressed={showKey}
                  onClick={() => setShowKey((shown) => !shown)}
                >
                  <StableLabel
                    label={
                      showKey ? t("editor.key.hide") : t("editor.key.show")
                    }
                    other={
                      showKey ? t("editor.key.show") : t("editor.key.hide")
                    }
                  />
                </Button>
                <ReadOnlyFieldset className={READ_ONLY_INLINE_CLASS}>
                  <Button
                    variant="secondary"
                    className={TEXT_BUTTON}
                    onClick={() => {
                      setShowKey(true);
                      setEditingKey(true);
                    }}
                  >
                    {t("editor.key.edit")}
                  </Button>
                  <Button
                    variant="secondary"
                    className={TEXT_BUTTON}
                    onClick={() => setPsk(regeneratedPsk(psk))}
                  >
                    {t("editor.key.generate")}
                  </Button>
                </ReadOnlyFieldset>
              </>
            }
          />
        )}
        {security === "secure" ? null : (
          <div className="border-t border-subtle px-4 py-3">
            <Callout
              tone={security === "insecureNoPrecise" ? "warning" : "danger"}
              title={t(`security.${security}.label`)}
            >
              {t(`security.${security}.description`)}
            </Callout>
          </div>
        )}
        <ReadOnlyFieldset className={READ_ONLY_ROWS_CLASS}>
          <SettingRow
            kind="select"
            label={t("editor.precision.label")}
            help={t("editor.precision.help")}
            value={String(precision)}
            options={precisionOptions}
            dirty={getFieldState("positionPrecision").isDirty}
            error={errorText("positionPrecision")}
            onValueChange={(next) => {
              setValue("positionPrecision", Number(next), opts);
              stage();
            }}
          />
          <SettingRow
            kind="switch"
            label={t("editor.mute.label")}
            help={t("editor.mute.help")}
            checked={values.isMuted ?? false}
            dirty={getFieldState("isMuted").isDirty}
            onCheckedChange={(checked) => {
              setValue("isMuted", checked, opts);
              stage();
            }}
          />
        </ReadOnlyFieldset>
      </SettingsCard>
      <SettingsCard title={t("editor.mqttCard")}>
        <ReadOnlyFieldset className={READ_ONLY_ROWS_CLASS}>
          <SettingRow
            kind="switch"
            label={t("editor.uplink.label")}
            help={t("editor.uplink.help")}
            checked={values.uplinkEnabled ?? false}
            dirty={getFieldState("uplinkEnabled").isDirty}
            onCheckedChange={(checked) => {
              setValue("uplinkEnabled", checked, opts);
              stage();
            }}
          />
          <SettingRow
            kind="switch"
            label={t("editor.downlink.label")}
            help={t("editor.downlink.help")}
            checked={values.downlinkEnabled ?? false}
            dirty={getFieldState("downlinkEnabled").isDirty}
            onCheckedChange={(checked) => {
              setValue("downlinkEnabled", checked, opts);
              stage();
            }}
          />
        </ReadOnlyFieldset>
      </SettingsCard>
    </>
  );
};
