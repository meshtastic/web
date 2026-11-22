import {
  SettingsGroup,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { ExternalLinkRow } from "@components/Settings/ExternalLinkRow.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import { DOCS_BASE, FIRMWARE_FLASHER_URL } from "@core/settings/registry.ts";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useRadioInfo } from "./radioInfo.ts";
import type { ConfigProps } from "./sectionProps.ts";

const FLASHING_GUIDE_URL = `${DOCS_BASE}/getting-started/flashing-firmware/`;

/**
 * Firmware update: what the radio runs, and the Web Flasher that installs
 * new firmware (the web client cannot flash by itself).
 */
export const Firmware = (_props: ConfigProps) => {
  const { t } = useTranslation("config");
  const navigate = useNavigate();
  const radio = useRadioInfo();
  const notReported = t("firmwareSection.notReported");

  return (
    <SettingsSections>
      <SettingsGroup title={t("firmwareSection.installedCard")}>
        <SettingRow
          kind="readonlyKey"
          label={t("firmwareSection.firmware")}
          help={t("firmwareSection.firmwareHelp")}
          value={radio.firmware ?? notReported}
          copyable={radio.firmware !== undefined}
        />
        <SettingRow
          kind="readonlyKey"
          label={t("firmwareSection.hardware")}
          value={radio.hardware ?? notReported}
          copyable={false}
        />
      </SettingsGroup>
      <SettingsGroup title={t("firmwareSection.updateCard")}>
        <ExternalLinkRow
          label={t("firmwareSection.openFlasher")}
          help={t("firmwareSection.openFlasherHelp")}
          actionLabel={t("firmwareSection.openFlasherAction")}
          href={FIRMWARE_FLASHER_URL}
        />
        <ExternalLinkRow
          label={t("firmwareSection.guide")}
          help={t("firmwareSection.guideHelp")}
          actionLabel={t("helpSection.openLink")}
          href={FLASHING_GUIDE_URL}
        />
        <SettingRow
          kind="button"
          label={t("settingsPages.administration.dfu.label", { ns: "ui" })}
          help={t("firmwareSection.dfuHelp")}
          actionLabel={t("navigation.administration")}
          onAction={() => void navigate({ to: "/settings/administration" })}
        />
      </SettingsGroup>
    </SettingsSections>
  );
};
