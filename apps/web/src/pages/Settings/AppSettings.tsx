import LanguageSwitcher from "@components/LanguageSwitcher.tsx";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import ThemeSwitcher from "@components/ThemeSwitcher.tsx";
import { useTranslation } from "react-i18next";
import { type ConfigProps, SettingsCard } from "./SettingsTabs.tsx";

/**
 * App preferences, stored in this browser. Android's Units setting is left
 * out: the web has no shared distance/altitude formatter to apply it to.
 */
export const AppSettings = (_props: ConfigProps) => {
  const { t } = useTranslation("ui");

  return (
    <SettingsCard>
      <SettingsSections>
        <SettingsGroup
          title={t("settingsPages.app.appearance")}
          description={t("settingsPages.app.appearanceDescription")}
        >
          <SettingsRow
            label={t("settingsPages.app.theme")}
            description={t("settingsPages.app.themeDescription")}
          >
            <ThemeSwitcher />
          </SettingsRow>
          <SettingsRow
            label={t("settingsPages.app.language")}
            description={t("settingsPages.app.languageDescription")}
          >
            <LanguageSwitcher />
          </SettingsRow>
        </SettingsGroup>
      </SettingsSections>
    </SettingsCard>
  );
};
