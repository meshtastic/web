import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type ParsedSecurity,
  type RawSecurity,
  RawSecuritySchema,
  RemoteRawSecuritySchema,
} from "@app/validation/config/security.ts";
import { ManagedModeDialog } from "@components/Dialog/ManagedModeDialog.tsx";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { SettingsFieldRow } from "@components/Settings/SettingsFieldRow.tsx";
import {
  READ_ONLY_INLINE_CLASS,
  READ_ONLY_ROWS_CLASS,
  ReadOnlyFieldset,
  SettingsReadOnlyContext,
  useSettingsReadOnly,
} from "@components/Settings/SettingsReadOnly.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { ConfirmDialog } from "@components/UI/ConfirmDialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import {
  SettingRow,
  settingRowDescribedBy,
} from "@components/UI/SettingRow.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import {
  adminKeyCandidates,
  adminKeySlots,
  MASKED_KEY,
} from "@core/settings/securityKeys.ts";
import {
  useMyNodeAsProto,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { useRemoteSettings } from "@core/settings/remoteContext.ts";
import { useDevice } from "@core/stores";
import { getX25519PrivateKey, getX25519PublicKey } from "@core/utils/x25519.ts";
import { Protobuf } from "@core/protobuf.ts";
import { useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import { base64Decode, base64Encode } from "@bufbuild/protobuf/wire";
import { useCallback, useEffect, useMemo, useState } from "react";
import { get, type Path, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AdminKeyPicker } from "./AdminKeyPicker.tsx";
import { GenerateAdminKeyDialog } from "./GenerateAdminKeyDialog.tsx";
import { LockdownSection } from "./LockdownSection.tsx";

interface SecurityConfigProps {
  onFormInit: DynamicFormFormInit<RawSecurity>;
}

const EMPTY_RADIO_SIGNAL = constantSignal<{
  security?: Protobuf.Config.Config_SecurityConfig;
}>({});

const keyText = (key: Uint8Array | undefined) =>
  base64Encode(key ?? new Uint8Array(0));

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
  // Released firmware replaces a node's key pair (its identity) when a
  // security write has no private key. A remote node's key goes back as
  // it was read; a node that withholds it (2.8.1+) is read-only here.
  const remote = useRemoteSettings();
  const remoteKey = remote ? config.security?.privateKey : undefined;
  const locked = remote !== undefined && remoteKey?.length !== 32;

  const formMethods = useForm<RawSecurity>({
    mode: "onChange",
    defaultValues: toFormShape(config.security),
    resolver: createZodResolver(
      locked ? RemoteRawSecuritySchema : RawSecuritySchema,
    ),
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
  const [pickingRadio, setPickingRadio] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [confirmingStrict, setConfirmingStrict] = useState(false);

  useEffect(() => {
    onFormInit?.(formMethods);
  }, [onFormInit, formMethods]);

  const [privateKeyDialogOpen, setPrivateKeyDialogOpen] =
    useState<boolean>(false);
  const [managedModeDialogOpen, setManagedModeDialogOpen] =
    useState<boolean>(false);

  const onSubmit = (data: RawSecurity) => {
    if (!formState.isReady || !editor || locked) return;

    const payload: ParsedSecurity = {
      ...data,
      privateKey: remoteKey ?? base64Decode(data.privateKey),
      publicKey: base64Decode(data.publicKey),
      adminKey: [
        base64Decode(data.adminKey.at(0) ?? ""),
        base64Decode(data.adminKey.at(1) ?? ""),
        base64Decode(data.adminKey.at(2) ?? ""),
      ],
    };
    editor.setRadioSection("security", payload);
  };

  const pkiRegenerate = () => {
    const privateKey = getX25519PrivateKey();
    updatePublicKey(base64Encode(privateKey));
  };

  const updatePublicKey = async (privateKey: string) => {
    try {
      const publicKey = base64Encode(
        getX25519PublicKey(base64Decode(privateKey)),
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
  const packetSignaturePolicyOptions: Record<string, number> = {
    [t("security.packetSignaturePolicy.compatible")]:
      PacketSignaturePolicy.COMPATIBLE,
    [t("security.packetSignaturePolicy.balanced")]:
      PacketSignaturePolicy.BALANCED,
    [t("security.packetSignaturePolicy.strict")]: PacketSignaturePolicy.STRICT,
  };
  const packetSignaturePolicyHelp: Record<number, string> = {
    [PacketSignaturePolicy.COMPATIBLE]: t(
      "security.packetSignaturePolicy.compatibleDescription",
    ),
    [PacketSignaturePolicy.BALANCED]: t(
      "security.packetSignaturePolicy.balancedDescription",
    ),
    [PacketSignaturePolicy.STRICT]: t(
      "security.packetSignaturePolicy.strictDescription",
    ),
  };
  const packetSignaturePolicy = useWatch({
    control,
    name: "packetSignaturePolicy",
  });
  const readOnly = useSettingsReadOnly() || locked;
  // Only a radio that reports XEdDSA signing can apply the policy.
  const canSetPolicy = metadata?.hasXeddsa === true && !readOnly;
  // Losing support or write access cancels a pending Strict confirmation,
  // as on Android, so it can't reappear by itself when access returns.
  const [couldSetPolicy, setCouldSetPolicy] = useState(canSetPolicy);
  if (couldSetPolicy !== canSetPolicy) {
    setCouldSetPolicy(canSetPolicy);
    if (!canSetPolicy) setConfirmingStrict(false);
  }

  /** Strict hides unauthenticated traffic, so it is confirmed first. */
  const confirmPolicyChange = (label: string): boolean => {
    const next = packetSignaturePolicyOptions[label];
    if (
      next !== PacketSignaturePolicy.STRICT ||
      packetSignaturePolicy === PacketSignaturePolicy.STRICT
    ) {
      return true;
    }
    setConfirmingStrict(true);
    return false;
  };

  const enableStrict = () => {
    setConfirmingStrict(false);
    if (!canSetPolicy) return;
    setValue("packetSignaturePolicy", PacketSignaturePolicy.STRICT, {
      shouldDirty: true,
      shouldValidate: true,
    });
    void handleSubmit(onSubmit)();
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
  const nodes = useNodesAsProto();
  const myNode = useMyNodeAsProto();
  const fallbackName = useCallback(
    (last4: string) => t("fallbackName", { ns: "common", last4 }),
    [t],
  );
  const candidates = useMemo(
    () =>
      adminKeyCandidates(nodes, {
        myNodeNum: myNode?.num,
        // This radio's own key too, in case its node info hasn't arrived.
        takenKeys: [
          publicKey ?? "",
          ...(adminKeys ?? []).filter((_, index) => index !== addingSlot),
        ],
        fallbackName,
      }),
    [nodes, myNode?.num, publicKey, adminKeys, addingSlot, fallbackName],
  );
  /** Fill the slot being added and close its row. */
  const fillAddingSlot = (key: string) => {
    if (addingSlot === undefined) return;
    setAdminKey(addingSlot, key);
    setAddingSlot(undefined);
  };
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
      {remote ? (
        locked ? null : (
          <SettingRow
            kind="readonlyKey"
            label={t("security.privateKey.label")}
            help={t("remoteSettings.privateKeyRemote", { name: remote.name })}
            value={MASKED_KEY}
            copyable={false}
          />
        )
      ) : editingPrivateKey ? (
        <SettingsFieldRow
          label={t("security.privateKey.label")}
          htmlFor="privateKeyInput"
          help={t("securitySection.privateKeyHelp")}
          error={errorText("privateKey")}
          dirty={getFieldState("privateKey").isDirty}
        >
          <ReadOnlyFieldset className={READ_ONLY_INLINE_CLASS}>
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
          </ReadOnlyFieldset>
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
              <ReadOnlyFieldset className={READ_ONLY_INLINE_CLASS}>
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
              </ReadOnlyFieldset>
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
                <ReadOnlyFieldset className={READ_ONLY_INLINE_CLASS}>
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
                </ReadOnlyFieldset>
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
          <ReadOnlyFieldset className={READ_ONLY_INLINE_CLASS}>
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
              onClick={() => setPickingRadio(true)}
            >
              {t("securitySection.pickRadio")}
            </Button>
            <Button
              variant="secondary"
              className="text-help"
              onClick={() => setGeneratingKey(true)}
            >
              {t("securitySection.generateKey")}
            </Button>
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
          </ReadOnlyFieldset>
        </SettingsFieldRow>
      )}
      {slots.nextEmpty !== undefined && addingSlot === undefined ? (
        <ReadOnlyFieldset className={READ_ONLY_ROWS_CLASS}>
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
        </ReadOnlyFieldset>
      ) : null}
    </>
  );

  const form = (
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
                  : packetSignaturePolicyHelp[packetSignaturePolicy],
              disabled: metadata?.hasXeddsa !== true,
              validate: confirmPolicyChange,
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
          contentHandlesReadOnly: true,
          fields: [],
        },
        {
          label: t("securitySection.remoteAdminCard"),
          description: t("securitySection.remoteAdminCardDescription"),
          content: adminRows,
          contentHandlesReadOnly: true,
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
          // Lockdown unlocks the radio this app is connected to.
          footer: remote ? undefined : <LockdownSection />,
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
  );

  return (
    <>
      {locked ? (
        <>
          <Callout tone="info">
            {t("remoteSettings.securityLocked", { name: remote.name })}
          </Callout>
          {/* Every editable control is disabled; copy buttons still work. */}
          <SettingsReadOnlyContext.Provider value={true}>
            {form}
          </SettingsReadOnlyContext.Provider>
        </>
      ) : (
        form
      )}
      <ConfirmDialog
        open={confirmingStrict && canSetPolicy}
        onOpenChange={setConfirmingStrict}
        title={t("security.packetSignaturePolicy.strictConfirm.title")}
        description={t(
          "security.packetSignaturePolicy.strictConfirm.description",
        )}
        confirmLabel={t("security.packetSignaturePolicy.strictConfirm.confirm")}
        onConfirm={enableStrict}
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

      <AdminKeyPicker
        open={pickingRadio}
        onOpenChange={setPickingRadio}
        candidates={candidates}
        onPick={(key) => {
          setPickingRadio(false);
          fillAddingSlot(key);
        }}
      />

      {generatingKey ? (
        <GenerateAdminKeyDialog
          onOpenChange={setGeneratingKey}
          onUse={(key) => {
            setGeneratingKey(false);
            fillAddingSlot(key);
          }}
        />
      ) : null}

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
