import {
  SettingsGroup,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { useDeviceConnected } from "@components/PageComponents/SettingsPages/useDeviceConnected.ts";
import { Callout } from "@components/UI/Callout.tsx";
import { ConfirmDialog } from "@components/UI/ConfirmDialog.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores";
import type { DialogVariant } from "@core/stores/deviceStore/types.ts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConfigProps } from "./sectionProps.ts";
import { useActiveClient } from "@core/kmp/hooks";

type AdminAction = {
  key:
    | "reboot"
    | "dfu"
    | "shutdown"
    | "factoryResetDevice"
    | "factoryResetConfig"
    | "resetNodeDb";
  destructive?: boolean;
  /** Opens one of the existing device dialogs. */
  dialog?: DialogVariant;
};

// Order follows Android. Set time is left out: the SDK sends it only during
// the connect handshake and has no public call for it.
const ACTIONS: AdminAction[] = [
  { key: "reboot", dialog: "reboot" },
  // The web can't tell an nRF52 board apart (Android uses its hardware
  // list), so DFU stays visible like in the command palette.
  { key: "dfu", destructive: true },
  { key: "shutdown", dialog: "shutdown" },
  {
    key: "factoryResetDevice",

    destructive: true,
    dialog: "factoryResetDevice",
  },
  {
    key: "factoryResetConfig",

    destructive: true,
    dialog: "factoryResetConfig",
  },
  {
    key: "resetNodeDb",

    destructive: true,
    dialog: "resetNodeDb",
  },
];

/** Android's Administration screen: power and reset actions for the node. */
export const Administration = (_props: ConfigProps) => {
  const { t } = useTranslation("ui");
  const { toast } = useToast();
  const { setDialogOpen } = useDevice();
  const connection = useActiveClient();
  const connected = useDeviceConnected();
  const [dfuConfirmOpen, setDfuConfirmOpen] = useState(false);

  const enterDfu = async () => {
    setDfuConfirmOpen(false);
    try {
      await connection?.enterDfuMode();
      toast({ title: t("settingsPages.administration.dfu.sent") });
    } catch {
      toast({ title: t("settingsPages.administration.dfu.failed") });
    }
  };

  const row = ({ key, destructive, dialog }: AdminAction) => (
    <SettingRow
      key={key}
      kind="button"
      label={t(`settingsPages.administration.${key}.label`)}
      help={t(`settingsPages.administration.${key}.description`)}
      tone={destructive ? "danger" : "default"}
      disabled={!connected}
      actionLabel={t(`settingsPages.administration.${key}.action`)}
      onAction={() =>
        dialog ? setDialogOpen(dialog, true) : setDfuConfirmOpen(true)
      }
    />
  );

  return (
    <SettingsSections>
      {!connected && (
        <Callout tone="warning">{t("settingsPages.notConnected")}</Callout>
      )}
      <SettingsGroup title={t("adminSection.powerCard", { ns: "config" })}>
        {ACTIONS.filter((action) => !action.destructive).map(row)}
      </SettingsGroup>
      <SettingsGroup
        tone="danger"
        title={t("adminSection.dangerZone", { ns: "config" })}
        description={t("adminSection.dangerZoneDescription", { ns: "config" })}
      >
        {ACTIONS.filter((action) => action.destructive).map(row)}
      </SettingsGroup>

      <ConfirmDialog
        open={dfuConfirmOpen}
        onOpenChange={setDfuConfirmOpen}
        tone="danger"
        title={t("settingsPages.administration.dfu.confirmTitle")}
        description={t("settingsPages.administration.dfu.description")}
        confirmLabel={t("settingsPages.administration.dfu.confirm")}
        onConfirm={() => void enterDfu()}
      />
    </SettingsSections>
  );
};
