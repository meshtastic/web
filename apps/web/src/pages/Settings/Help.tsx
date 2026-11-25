import {
  SettingsGroup,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { useCommandMenuShortcutLabel } from "@components/CommandPalette/useCommandMenuShortcutLabel.ts";
import { ExternalLinkRow } from "@components/Settings/ExternalLinkRow.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import {
  useDownloadDiagnostics,
  useDownloadTraces,
} from "@core/diagnostics/useDownloadDiagnostics.ts";
import { useNodesAsProto } from "@core/hooks/useNodesAsProto.ts";
import { DOCS_BASE } from "@core/settings/registry.ts";
import { useAppStore } from "@core/stores";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRadioInfo } from "./radioInfo.ts";
import type { ConfigProps } from "./sectionProps.ts";

const LINKS = [
  { key: "docs", url: `${DOCS_BASE}/` },
  { key: "webClient", url: `${DOCS_BASE}/software/web-client/` },
  { key: "gettingStarted", url: `${DOCS_BASE}/getting-started/` },
  { key: "issues", url: "https://github.com/meshtastic/web/issues" },
] as const;

/**
 * Help & documentation: links out, the setup walkthrough, the command menu
 * shortcut, and diagnostics and trace files for bug reports.
 */
export const Help = (_props: ConfigProps) => {
  const { t } = useTranslation("config");
  const navigate = useNavigate();
  const setCommandPaletteOpen = useAppStore(
    (state) => state.setCommandPaletteOpen,
  );
  const keys = useCommandMenuShortcutLabel();
  const { firmware, hardware } = useRadioInfo();
  const nodeCount = useNodesAsProto().length;
  const radio = useMemo(
    () => ({ firmware, hardware, nodeCount }),
    [firmware, hardware, nodeCount],
  );
  const downloadDiagnostics = useDownloadDiagnostics(radio);
  const downloadTraces = useDownloadTraces();

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
      <SettingsGroup title={t("helpSection.walkthroughCard")}>
        <SettingRow
          kind="button"
          label={t("helpSection.walkthrough")}
          help={t("helpSection.walkthroughHelp")}
          actionLabel={t("helpSection.walkthroughAction")}
          onAction={() => void navigate({ to: "/welcome" })}
        />
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
      <SettingsGroup title={t("helpSection.troubleshootingCard")}>
        <SettingRow
          kind="button"
          label={t("helpSection.diagnostics")}
          help={t("diagnostics.help", { ns: "common" })}
          actionLabel={t("helpSection.diagnosticsAction")}
          onAction={downloadDiagnostics}
        />
        <SettingRow
          kind="button"
          label={t("helpSection.traces")}
          help={t("helpSection.tracesHelp")}
          actionLabel={t("helpSection.diagnosticsAction")}
          onAction={downloadTraces}
        />
      </SettingsGroup>
    </SettingsSections>
  );
};
