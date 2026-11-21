import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type ParsedSecurity,
  type RawSecurity,
  RawSecuritySchema,
} from "@app/validation/config/security.ts";
import { ManagedModeDialog } from "@components/Dialog/ManagedModeDialog.tsx";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { SettingsFieldRow } from "@components/Settings/SettingsFieldRow.tsx";
import { Button } from "@components/UI/Button.tsx";
import { ConfirmDialog } from "@components/UI/ConfirmDialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import {
  SettingRow,
  settingRowDescribedBy,
} from "@components/UI/SettingRow.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { adminKeySlots, MASKED_KEY } from "@core/settings/securityKeys.ts";
import { useDevice } from "@core/stores";
import { getX25519PrivateKey, getX25519PublicKey } from "@core/utils/x25519.ts";
import { Protobuf } from "@core/protobuf.ts";
import { useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import { fromByteArray, toByteArray } from "base64-js";
import { useEffect, useState } from "react";
import { get, type Path, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { LockdownSection } from "./LockdownSection.tsx";

interface SecurityConfigProps {
  onFormInit: DynamicFormFormInit<RawSecurity>;
}

const EMPTY_RADIO_SIGNAL = constantSignal<{
  security?: Protobuf.Config.Config_SecurityConfig;
}>({});

const keyText = (key: Uint8Array | undefined) =>
  fromByteArray(key ?? new Uint8Array(0));

/** The form's view of the security section: keys as base64. */
const toFormShape = (
  cfg: Protobuf.Config.Config_SecurityConfig | undefined,
): RawSecurity => ({
  isManaged: cfg?.isManaged ?? false,
  debugLogApiEnabled: cfg?.debugLogApiEnabled ?? false,
  serialEnabled: cfg?.serialEnabled ?? false,
  packetSignaturePolicy:
    cfg?.packetSignaturePolicy ??
    Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy.COMPATIBLE,
  privateKey: keyText(cfg?.privateKey),
  publicKey: keyText(cfg?.publicKey),
  adminKey: [
    keyText(cfg?.adminKey?.at(0)),
    keyText(cfg?.adminKey?.at(1)),
    keyText(cfg?.adminKey?.at(2)),
  ],
});

const ADMIN_KEY_FIELDS = ["adminKey.0", "adminKey.1", "adminKey.2"] as const;

export const Security = ({ onFormInit }: SecurityConfigProps) => {
  useWaitForConfig({ configCase: "security" });

  const { config, getEffectiveConfig } = useDevice();
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO_SIGNAL);
  const effective = radio.security ?? getEffectiveConfig("security");

  const { t } = useTranslation("config");
  const { metadata } = useDeviceCapabilities();

  const formMethods = useForm<RawSecurity>({
    mode: "onChange",
    defaultValues: toFormShape(config.security),
    resolver: createZodResolver(RawSecuritySchema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: toFormShape(effective),
  });
  const { setValue, trigger, handleSubmit, formState, getFieldState, control } =
    formMethods;
  const [privateKey, publicKey, adminKeys] = useWatch({
    control,
    name: ["privateKey", "publicKey", "adminKey"],
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [editingPrivateKey, setEditingPrivateKey] = useState(false);
  const [addingSlot, setAddingSlot] = useState<number>();
  const [removingSlot, setRemovingSlot] = useState<number>();

  useEffect(() => {
    onFormInit?.(formMethods);
  }, [onFormInit, formMethods]);

  const [privateKeyDialogOpen, setPrivateKeyDialogOpen] =
    useState<boolean>(false);
  const [managedModeDialogOpen, setManagedModeDialogOpen] =
    useState<boolean>(false);

  const onSubmit = (data: RawSecurity) => {
    if (!formState.isReady || !editor) return;

    const payload: ParsedSecurity = {
      ...data,
      privateKey: toByteArray(data.privateKey),
      publicKey: toByteArray(data.publicKey),
      adminKey: [
        toByteArray(data.adminKey.at(0) ?? ""),
        toByteArray(data.adminKey.at(1) ?? ""),
        toByteArray(data.adminKey.at(2) ?? ""),
      ],
    };
    editor.setRadioSection("security", payload);
  };

  const pkiRegenerate = () => {
    const privateKey = getX25519PrivateKey();
    updatePublicKey(fromByteArray(privateKey));
  };

  const updatePublicKey = async (privateKey: string) => {
    try {
      const publicKey = fromByteArray(
        getX25519PublicKey(toByteArray(privateKey)),
      );
      setValue("privateKey", privateKey, { shouldDirty: true });
      setValue("publicKey", publicKey, { shouldDirty: true });

      setPrivateKeyDialogOpen(false);
    } catch {
      setValue("privateKey", privateKey, { shouldDirty: true });
    }
    const valid = await trigger(["privateKey", "publicKey"]);
    if (valid) {
      handleSubmit(onSubmit)();
    }
  };

  // Option text keyed to the enum value, so the select shows translated
  // labels rather than the raw enum names.
  const PacketSignaturePolicy =
    Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy;
  const packetSignaturePolicyOptions = {
    [t("security.packetSignaturePolicy.compatible")]:
      PacketSignaturePolicy.COMPATIBLE,
    [t("security.packetSignaturePolicy.balanced")]:
      PacketSignaturePolicy.BALANCED,
    [t("security.packetSignaturePolicy.strict")]: PacketSignaturePolicy.STRICT,
  };

  /** The translated validation message for a field, as DynamicForm shows it. */
  const errorText = (name: Path<RawSecurity>): string | undefined => {
    const error = get(formState.errors, name);
    if (!error) return undefined;
    return String(
      t([`formValidation.${error.type}`, String(error.message)], {
        ns: "common",
        ...error.params,
      }),
    );
  };

  const setAdminKey = (index: number, value: string) => {
    const name = ADMIN_KEY_FIELDS[index];
    if (!name) return;
    setValue(name, value, { shouldDirty: true, shouldValidate: true });
    void handleSubmit(onSubmit)();
  };

  const slots = adminKeySlots(adminKeys ?? []);
  const addingField =
    addingSlot === undefined ? undefined : ADMIN_KEY_FIELDS[addingSlot];
  const addingError = addingField ? errorText(addingField) : undefined;
  const isManaged = useWatch({ control, name: "isManaged" });
  // Removing the last key while managed would lock the radio's settings.
  const removingLastManagedKey =
    removingSlot !== undefined && isManaged && slots.filled.length === 1;
  const adminLabel = (index: number) =>
    t("securitySection.adminKeyLabel", { number: index + 1 });

  const keyRows = (
    <>
      <SettingRow
        kind="readonlyKey"
        label={t("security.publicKey.label")}
        help={t("securitySection.publicKeyHelp")}
        value={publicKey ?? ""}
        dirty={getFieldState("publicKey").isDirty}
        error={errorText("publicKey")}
      />
      {editingPrivateKey ? (
        <SettingsFieldRow
          label={t("security.privateKey.label")}
          htmlFor="privateKeyInput"
          help={t("securitySection.privateKeyHelp")}
          error={errorText("privateKey")}
          dirty={getFieldState("privateKey").isDirty}
        >
          <Input
            id="privateKeyInput"
            className="font-mono"
            containerClassName="w-full sm:w-[320px]"
            autoComplete="off"
            spellCheck={false}
            value={privateKey ?? ""}
            aria-invalid={errorText("privateKey") ? true : undefined}
            aria-describedby={settingRowDescribedBy("privateKeyInput", {
              help: true,
              error: Boolean(errorText("privateKey")),
            })}
            variant={
              errorText("privateKey")
                ? "invalid"
                : getFieldState("privateKey").isDirty
                  ? "dirty"
                  : "default"
            }
            onChange={(event) => void updatePublicKey(event.target.value)}
          />
          <Button
            variant="secondary"
            className="text-help"
            onClick={() => setEditingPrivateKey(false)}
          >
            {t("securitySection.done")}
          </Button>
        </SettingsFieldRow>
      ) : (
        <SettingRow
          kind="readonlyKey"
          label={t("security.privateKey.label")}
          help={t("securitySection.privateKeyHelp")}
          value={showPrivateKey ? (privateKey ?? "") : MASKED_KEY}
          copyable={showPrivateKey}
          dirty={getFieldState("privateKey").isDirty}
          error={errorText("privateKey")}
          actions={
            <>
              <Button
                variant="secondary"
                className="text-help"
                aria-pressed={showPrivateKey}
                onClick={() => setShowPrivateKey((shown) => !shown)}
              >
                {showPrivateKey
                  ? t("securitySection.hide")
                  : t("securitySection.show")}
              </Button>
              <Button
                variant="secondary"
                className="text-help"
                onClick={() => {
                  setShowPrivateKey(true);
                  setEditingPrivateKey(true);
                }}
              >
                {t("securitySection.edit")}
              </Button>
              <Button
                variant="secondary"
                className="text-help text-danger"
                onClick={() => setPrivateKeyDialogOpen(true)}
              >
                {t("button.regenerate")}
              </Button>
            </>
          }
        />
      )}
    </>
  );

  const adminRows = (
    <>
      {slots.filled
        .filter(({ index }) => index !== addingSlot)
        .map(({ index, value }) => {
          const name = ADMIN_KEY_FIELDS[index];
          return (
            <SettingRow
              key={index}
              kind="readonlyKey"
              label={adminLabel(index)}
              help={t("securitySection.adminKeyHelp")}
              value={value}
              dirty={name ? getFieldState(name).isDirty : false}
              error={name ? errorText(name) : undefined}
              actions={
                <Button
                  variant="secondary"
                  className="text-help text-danger"
                  aria-label={t("securitySection.removeAdminKey", {
                    number: index + 1,
                  })}
                  onClick={() => setRemovingSlot(index)}
                >
                  {t("button.remove")}
                </Button>
              }
            />
          );
        })}
      {addingSlot === undefined ? null : (
        <SettingsFieldRow
          label={t("securitySection.newAdminKey")}
          htmlFor="newAdminKeyInput"
          help={t("securitySection.newAdminKeyHelp")}
          error={addingError}
          dirty
        >
          <Input
            id="newAdminKeyInput"
            className="font-mono"
            containerClassName="w-full sm:w-[320px]"
            autoComplete="off"
            spellCheck={false}
            variant={addingError ? "invalid" : "dirty"}
            aria-invalid={addingError ? true : undefined}
            aria-describedby={settingRowDescribedBy("newAdminKeyInput", {
              help: true,
              error: Boolean(addingError),
            })}
            value={adminKeys?.[addingSlot] ?? ""}
            onChange={(event) => setAdminKey(addingSlot, event.target.value)}
          />
          <Button
            variant="secondary"
            className="text-help"
            onClick={() => setAddingSlot(undefined)}
          >
            {t("securitySection.done")}
          </Button>
          <Button
            variant="ghost"
            className="text-help"
            onClick={() => {
              setAdminKey(addingSlot, "");
              setAddingSlot(undefined);
            }}
          >
            {t("securitySection.cancel")}
          </Button>
        </SettingsFieldRow>
      )}
      {slots.nextEmpty !== undefined && addingSlot === undefined ? (
        <SettingRow
          kind="button"
          label={t("securitySection.addAdminKey")}
          help={
            slots.filled.length === 0
              ? t("securitySection.noAdminKeys")
              : t("securitySection.addAdminKeyHelp")
          }
          actionLabel={t("securitySection.addKey")}
          onAction={() => setAddingSlot(slots.nextEmpty)}
        />
      ) : null}
    </>
  );

  return (
    <>
      <DynamicForm<RawSecurity>
        propMethods={formMethods}
        onSubmit={onSubmit}
        fieldGroups={[
          {
            label: t("security.packetSignaturesCard.label"),
            description: t("security.packetSignaturesCard.description"),
            fields: [
              {
                type: "select",
                name: "packetSignaturePolicy",
                label: t("security.packetSignaturePolicy.label"),
                description:
                  metadata?.hasXeddsa === false
                    ? t("security.packetSignaturePolicy.unsupported")
                    : t("security.packetSignaturePolicy.description"),
                // Only a radio that reports XEdDSA signing can apply the policy.
                disabled: metadata?.hasXeddsa !== true,
                properties: {
                  enumValue: packetSignaturePolicyOptions,
                },
              },
            ],
          },
          {
            label: t("securitySection.keysCard"),
            description: t("securitySection.keysCardDescription"),
            content: keyRows,
            fields: [],
          },
          {
            label: t("securitySection.remoteAdminCard"),
            description: t("securitySection.remoteAdminCardDescription"),
            content: adminRows,
            fields: [
              {
                type: "toggle",
                name: "isManaged",
                label: t("security.managed.label"),
                description: t("security.managed.description"),
                inputChange: (checked) => {
                  if (checked) {
                    setManagedModeDialogOpen(true);
                  }
                  setValue("isManaged", false);
                },
              },
            ],
            footer: <LockdownSection />,
          },
          {
            label: t("securitySection.accessCard"),
            description: t("securitySection.accessCardDescription"),
            fields: [
              {
                type: "toggle",
                name: "serialEnabled",
                label: t("security.serialOutputEnabled.label"),
                description: t("security.serialOutputEnabled.description"),
              },
              {
                type: "toggle",
                name: "debugLogApiEnabled",
                label: t("security.enableDebugLogApi.label"),
                description: t("security.enableDebugLogApi.description"),
              },
            ],
          },
        ]}
      />
      <ConfirmDialog
        open={privateKeyDialogOpen}
        onOpenChange={setPrivateKeyDialogOpen}
        tone="danger"
        title={t("pkiRegenerate.title", { ns: "dialog" })}
        description={t("pkiRegenerate.description", { ns: "dialog" })}
        confirmLabel={t("button.regenerate")}
        onConfirm={pkiRegenerate}
      />

      <ConfirmDialog
        open={removingSlot !== undefined}
        onOpenChange={(open) => {
          if (!open) setRemovingSlot(undefined);
        }}
        tone="danger"
        title={t("securitySection.removeAdminKeyTitle", {
          number: (removingSlot ?? 0) + 1,
        })}
        description={
          removingLastManagedKey
            ? t("securitySection.removeLastManagedKey")
            : t("securitySection.removeAdminKeyDescription")
        }
        confirmLabel={t("button.remove")}
        onConfirm={() => {
          if (removingSlot !== undefined) setAdminKey(removingSlot, "");
          setRemovingSlot(undefined);
        }}
      />

      <ManagedModeDialog
        open={managedModeDialogOpen}
        onOpenChange={() => setManagedModeDialogOpen((prev) => !prev)}
        onSubmit={() => {
          setValue("isManaged", true);
          setManagedModeDialogOpen(false);
        }}
      />
    </>
  );
};
