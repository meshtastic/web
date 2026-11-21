import {
  SettingsGroup,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { ExternalLinkRow } from "@components/Settings/ExternalLinkRow.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import { commandMenuShortcutLabel } from "@core/commandMenu/shortcut.ts";
import { DOCS_BASE } from "@core/settings/registry.ts";
import { useAppStore } from "@core/stores";
import { useTranslation } from "react-i18next";
import type { ConfigProps } from "./sectionProps.ts";

const LINKS = [
  { key: "docs", url: `${DOCS_BASE}/` },
  { key: "webClient", url: `${DOCS_BASE}/software/web-client/` },
  { key: "gettingStarted", url: `${DOCS_BASE}/getting-started/` },
  { key: "issues", url: "https://github.com/meshtastic/web/issues" },
] as const;

/** Help & documentation: links out, and the command menu shortcut. */
export const Help = (_props: ConfigProps) => {
  const { t } = useTranslation("config");
  const setCommandPaletteOpen = useAppStore(
    (state) => state.setCommandPaletteOpen,
  );
  const keys = commandMenuShortcutLabel(
    globalThis.navigator?.platform ?? "",
    t("keys.ctrl", { ns: "commandPalette" }),
  );

  return (
    <SettingsSections>
      <SettingsGroup title={t("helpSection.resourcesCard")}>
        {LINKS.map((link) => (
          <ExternalLinkRow
            key={link.key}
            label={t(`helpSection.${link.key}`)}
            help={t(`helpSection.${link.key}Help`)}
            actionLabel={t("helpSection.openLink")}
            href={link.url}
          />
        ))}
      </SettingsGroup>
      <SettingsGroup title={t("helpSection.shortcutsCard")}>
        <SettingRow
          kind="button"
          label={t("helpSection.commandMenu")}
          help={t("helpSection.commandMenuHelp", { keys })}
          actionLabel={t("helpSection.show")}
          onAction={() => setCommandPaletteOpen(true)}
        />
      </SettingsGroup>
    </SettingsSections>
  );
};
