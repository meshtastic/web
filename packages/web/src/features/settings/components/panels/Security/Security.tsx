import { ManagedModeDialog } from "@shared/components/Dialog/ManagedModeDialog";
import { PkiRegenerateDialog } from "@shared/components/Dialog/PkiRegenerateDialog";
import { useRemoteAdminAuth } from "@shared/hooks";
import { useUIStore } from "@state/index.ts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSecurityForm } from "../../../hooks/index.ts";
import { ConfigFormSkeleton } from "../../../pages/SettingsLoading.tsx";
import type { RawSecurity } from "../../../validation/config/security.ts";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../../form/ConfigFormFields.tsx";

export const Security = () => {
  const { t } = useTranslation("config");
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);
  const { isAuthorized } = useRemoteAdminAuth();
  const {
    form,
    isReady,
    isDisabledByField,
    regenerateKeys,
    updatePublicKeyFromPrivate,
  } = useSecurityForm();

  const [privateKeyDialogOpen, setPrivateKeyDialogOpen] = useState(false);
  const [managedModeDialogOpen, setManagedModeDialogOpen] = useState(false);

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const bits = [
    {
      text: t("security.256bit"),
      value: "32",
      key: "bit256",
    },
  ];

  const fieldGroups: FieldGroup<RawSecurity>[] = [
    {
      label: t("security.title"),
      description: t("security.description"),
      fields: [
        {
          type: "passwordGenerator",
          name: "privateKey",
          label: t("security.privateKey.label"),
          description: t("security.privateKey.description"),
          inputChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            updatePublicKeyFromPrivate(e.target.value);
          },
          passwordGenerator: {
            id: "pskInput",
            hide: true,
            bits,
            devicePSKBitCount: 32,
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
          },
          properties: {
            showCopyButton: true,
            showPasswordToggle: true,
          },
        },
        {
          type: "text",
          name: "publicKey",
          label: t("security.publicKey.label"),
          description: t("security.publicKey.description"),
          disabled: true,
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
          label: t("security.primaryAdminKey.label"),
          description: t("security.primaryAdminKey.description"),
          disabledBy: [{ fieldName: "adminChannelEnabled", invert: true }],
          passwordGenerator: {
            id: "adminKey0Input",
            bits,
            devicePSKBitCount: 32,
            actionButtons: [],
          },
          properties: {
            showCopyButton: true,
          },
        },
        {
          type: "passwordGenerator",
          name: "adminKey.1",
          label: t("security.secondaryAdminKey.label"),
          description: t("security.secondaryAdminKey.description"),
          disabledBy: [{ fieldName: "adminChannelEnabled", invert: true }],
          passwordGenerator: {
            id: "adminKey1Input",
            bits,
            devicePSKBitCount: 32,
            actionButtons: [],
          },
          properties: {
            showCopyButton: true,
          },
        },
        {
          type: "passwordGenerator",
          name: "adminKey.2",
          label: t("security.tertiaryAdminKey.label"),
          description: t("security.tertiaryAdminKey.description"),
          disabledBy: [{ fieldName: "adminChannelEnabled", invert: true }],
          passwordGenerator: {
            id: "adminKey2Input",
            bits,
            devicePSKBitCount: 32,
            actionButtons: [],
          },
          properties: {
            showCopyButton: true,
          },
        },
        {
          type: "toggle",
          name: "isManaged",
          label: t("security.managed.label"),
          description: t("security.managed.description"),
          inputChange: (checked: boolean) => {
            if (checked) {
              setManagedModeDialogOpen(true);
            }
            form.setValue("isManaged", false);
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
  ];

  return (
    <>
      <ConfigFormFields
        form={form}
        fieldGroups={fieldGroups}
        isDisabledByField={isDisabledByField}
        disabled={!isAuthorized}
      />
      <PkiRegenerateDialog
        text={{
          button: t("button.regenerate"),
          title: t("pkiRegenerate.title"),
          description: t("pkiRegenerate.description"),
        }}
        open={privateKeyDialogOpen}
        onOpenChange={setPrivateKeyDialogOpen}
        onSubmit={regenerateKeys}
      />
      <ManagedModeDialog
        open={managedModeDialogOpen}
        onOpenChange={() => setManagedModeDialogOpen((prev) => !prev)}
        onSubmit={() => {
          form.setValue("isManaged", true);
          setManagedModeDialogOpen(false);
        }}
      />
    </>
  );
};
