import { DialogWrapper } from "@components/Dialog/DialogWrapper.tsx";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { useDeviceConnected } from "@components/PageComponents/SettingsPages/useDeviceConnected.ts";
import { Button } from "@components/UI/Button.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores";
import type { DialogVariant } from "@core/stores/deviceStore/types.ts";
import {
  FactoryIcon,
  HardDriveUploadIcon,
  type LucideIcon,
  PowerIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type ConfigProps, SettingsCard } from "./SettingsTabs.tsx";

type AdminAction = {
  key:
    | "reboot"
    | "dfu"
    | "shutdown"
    | "factoryResetDevice"
    | "factoryResetConfig"
    | "resetNodeDb";
  icon: LucideIcon;
  destructive?: boolean;
  /** Opens one of the existing device dialogs. */
  dialog?: DialogVariant;
};

// Order follows Android. Set time is left out: the SDK sends it only during
// the connect handshake and has no public call for it.
const ACTIONS: AdminAction[] = [
  { key: "reboot", icon: RefreshCwIcon, dialog: "reboot" },
  // The web can't tell an nRF52 board apart (Android uses its hardware
  // list), so DFU stays visible like in the command palette.
  { key: "dfu", icon: HardDriveUploadIcon, destructive: true },
  { key: "shutdown", icon: PowerIcon, dialog: "shutdown" },
  {
    key: "factoryResetDevice",
    icon: FactoryIcon,
    destructive: true,
    dialog: "factoryResetDevice",
  },
  {
    key: "factoryResetConfig",
    icon: FactoryIcon,
    destructive: true,
    dialog: "factoryResetConfig",
  },
  {
    key: "resetNodeDb",
    icon: TrashIcon,
    destructive: true,
    dialog: "resetNodeDb",
  },
];

/** Android's Administration screen: power and reset actions for the node. */
export const Administration = (_props: ConfigProps) => {
  const { t } = useTranslation("ui");
  const { toast } = useToast();
  const { setDialogOpen, connection } = useDevice();
  const connected = useDeviceConnected();
  const [dfuConfirmOpen, setDfuConfirmOpen] = useState(false);

  const enterDfu = async () => {
    try {
      await connection?.enterDfuMode();
      toast({ title: t("settingsPages.administration.dfu.sent") });
    } catch {
      toast({ title: t("settingsPages.administration.dfu.failed") });
    }
  };

  return (
    <SettingsCard>
      <SettingsSections>
        <SettingsGroup
          title={t("settingsPages.administration.title")}
          description={t("settingsPages.administration.description")}
        >
          {!connected && (
            <Subtle className="font-semibold">
              {t("settingsPages.notConnected")}
            </Subtle>
          )}
          {ACTIONS.map(({ key, icon: Icon, destructive, dialog }) => (
            <SettingsRow
              key={key}
              label={t(`settingsPages.administration.${key}.label`)}
              description={t(`settingsPages.administration.${key}.description`)}
              destructive={destructive}
            >
              <Button
                variant={destructive ? "destructive" : "outline"}
                disabled={!connected}
                onClick={() =>
                  dialog ? setDialogOpen(dialog, true) : setDfuConfirmOpen(true)
                }
              >
                <Icon className="mr-2 size-4" />
                {t(`settingsPages.administration.${key}.action`)}
              </Button>
            </SettingsRow>
          ))}
        </SettingsGroup>
      </SettingsSections>

      <DialogWrapper
        open={dfuConfirmOpen}
        onOpenChange={setDfuConfirmOpen}
        type="confirm"
        variant="destructive"
        title={t("settingsPages.administration.dfu.confirmTitle")}
        description={t("settingsPages.administration.dfu.description")}
        confirmText={t("settingsPages.administration.dfu.confirm")}
        onConfirm={enterDfu}
      />
    </SettingsCard>
  );
};
