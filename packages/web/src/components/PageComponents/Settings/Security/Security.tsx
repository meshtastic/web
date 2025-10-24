import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type ParsedSecurity,
  type RawSecurity,
  RawSecuritySchema,
} from "@app/validation/config/security.ts";
import { ManagedModeDialog } from "@components/Dialog/ManagedModeDialog.tsx";
import { PkiRegenerateDialog } from "@components/Dialog/PkiRegenerateDialog.tsx";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { getX25519PrivateKey, getX25519PublicKey } from "@core/utils/x25519.ts";
import { fromByteArray, toByteArray } from "base64-js";
import { useEffect, useState } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface SecurityConfigProps {
  onFormInit: DynamicFormFormInit<RawSecurity>;
}
export const Security = ({ onFormInit }: SecurityConfigProps) => {
  useWaitForConfig({ configCase: "security" });

  const { config, setChange, setDialogOpen, getEffectiveConfig, removeChange } =
    useDevice();

  const { t } = useTranslation("config");

  const defaultConfig = config.security;
  const defaultValues = {
    ...defaultConfig,
    ...{
      privateKey: fromByteArray(defaultConfig?.privateKey ?? new Uint8Array(0)),
      publicKey: fromByteArray(defaultConfig?.publicKey ?? new Uint8Array(0)),
      adminKey: [
        fromByteArray(defaultConfig?.adminKey?.at(0) ?? new Uint8Array(0)),
        fromByteArray(defaultConfig?.adminKey?.at(1) ?? new Uint8Array(0)),
        fromByteArray(defaultConfig?.adminKey?.at(2) ?? new Uint8Array(0)),
      ],
    },
  };

  const effectiveConfig = getEffectiveConfig("security");
  const formValues = {
    ...effectiveConfig,
    ...{
      privateKey: fromByteArray(
        effectiveConfig?.privateKey ?? new Uint8Array(0),
      ),
      publicKey: fromByteArray(effectiveConfig?.publicKey ?? new Uint8Array(0)),
      adminKey: [
        fromByteArray(effectiveConfig?.adminKey?.at(0) ?? new Uint8Array(0)),
        fromByteArray(effectiveConfig?.adminKey?.at(1) ?? new Uint8Array(0)),
        fromByteArray(effectiveConfig?.adminKey?.at(2) ?? new Uint8Array(0)),
      ],
    },
  };

  const formMethods = useForm<RawSecurity>({
    mode: "onChange",
    defaultValues: defaultValues as DefaultValues<RawSecurity>,
    resolver: createZodResolver(RawSecuritySchema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: formValues as RawSecurity,
  });
  const { setValue, trigger, handleSubmit, formState } = formMethods;

  useEffect(() => {
    onFormInit?.(formMethods);
  }, [onFormInit, formMethods]);

  const [privateKeyDialogOpen, setPrivateKeyDialogOpen] =
    useState<boolean>(false);
  const [managedModeDialogOpen, setManagedModeDialogOpen] =
    useState<boolean>(false);

  const onSubmit = (data: RawSecurity) => {
    if (!formState.isReady) {
      return;
    }

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

    if (deepCompareConfig(config.security, payload, true)) {
      removeChange({ type: "config", variant: "security" });
      return;
    }

    setChange(
      { type: "config", variant: "security" },
      payload,
      config.security,
    );
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
    } catch (_e) {
      setValue("privateKey", privateKey, { shouldDirty: true });
    }
    const valid = await trigger(["privateKey", "publicKey"]);
    if (valid) {
      handleSubmit(onSubmit)(); // manually invoke form submit
    }
  };

  const bits = [
    {
      text: t("security.256bit"),
      value: "32",
      key: "bit256",
    },
  ];

  return (
    <>
      <DynamicForm<RawSecurity>
        propMethods={formMethods}
        onSubmit={onSubmit}
        fieldGroups={[
          {
            label: t("security.title"),
            description: t("security.description"),
            fields: [
              {
                type: "passwordGenerator",
                id: "pskInput",
                name: "privateKey",
                label: t("security.privateKey.label"),
                description: t("security.privateKey.description"),
                bits,
                devicePSKBitCount: 32,
                hide: true,
                inputChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  updatePublicKey(e.target.value);
                },
                actionButtons: [
                  {
                    text: t("button.generate"),
                    onClick: () => setPrivateKeyDialogOpen(true),
                    variant: "success",
                  },
                  {
                    text: t("button.backupKey"),
                    onClick: () => setDialogOpen("pkiBackup", true),
                    variant: "subtle",
                  },
                ],
                properties: {
                  showCopyButton: true,
                  showPasswordToggle: true,
                },
              },
              {
                type: "text",
                name: "publicKey",
                label: t("security.publicKey.label"),
                disabled: true,
                description: t("security.publicKey.description"),
                properties: {
                  showCopyButton: true,
                },
              },
            ],
          },
          {
            label: t("security.adminSettings.label"),
            description: t("security.adminSettings.description"),
            fields: [
              {
                type: "passwordGenerator",
                name: "adminKey.0",
                id: "adminKey0Input",
                label: t("security.primaryAdminKey.label"),
                description: t("security.primaryAdminKey.description"),
                bits,
                devicePSKBitCount: 32,
                actionButtons: [],
                disabledBy: [
                  { fieldName: "adminChannelEnabled", invert: true },
                ],
                properties: {
                  showCopyButton: true,
                },
              },
              {
                type: "passwordGenerator",
                name: "adminKey.1",
                id: "adminKey1Input",
                label: t("security.secondaryAdminKey.label"),
                description: t("security.secondaryAdminKey.description"),
                bits,
                devicePSKBitCount: 32,
                actionButtons: [],
                disabledBy: [
                  { fieldName: "adminChannelEnabled", invert: true },
                ],
                properties: {
                  showCopyButton: true,
                },
              },
              {
                type: "passwordGenerator",
                name: "adminKey.2",
                id: "adminKey2Input",
                label: t("security.tertiaryAdminKey.label"),
                description: t("security.tertiaryAdminKey.description"),
                bits,
                devicePSKBitCount: 32,
                actionButtons: [],
                disabledBy: [
                  { fieldName: "adminChannelEnabled", invert: true },
                ],
                properties: {
                  showCopyButton: true,
                },
              },
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
              {
                type: "toggle",
                name: "adminChannelEnabled",
                label: t("security.adminChannelEnabled.label"),
                description: t("security.adminChannelEnabled.description"),
              },
            ],
          },
          {
            label: t("security.loggingSettings.label"),
            description: t("security.loggingSettings.description"),
            fields: [
              {
                type: "toggle",
                name: "debugLogApiEnabled",
                label: t("security.enableDebugLogApi.label"),
                description: t("security.enableDebugLogApi.description"),
              },
              {
                type: "toggle",
                name: "serialEnabled",
                label: t("security.serialOutputEnabled.label"),
                description: t("security.serialOutputEnabled.description"),
              },
            ],
          },
        ]}
      />
      <PkiRegenerateDialog
        text={{
          button: t("button.regenerate"),
          title: t("pkiRegenerate.title"),
          description: t("pkiRegenerate.description"),
        }}
        open={privateKeyDialogOpen}
        onOpenChange={() => setPrivateKeyDialogOpen((prev) => !prev)}
        onSubmit={pkiRegenerate}
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
