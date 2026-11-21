import {
  SettingsBlock,
  SettingsGroup,
  SettingsRow,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import { ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useRadioInfo } from "./radioInfo.ts";
import type { ConfigProps } from "./sectionProps.ts";

const GITHUB_URL = "https://github.com/meshtastic/web";
const WEBSITE_URL = "https://meshtastic.org";
const DOCS_URL = "https://meshtastic.org/docs/";
const LEGAL_URL = "https://meshtastic.org/docs/legal";
const LICENSE_URL = "https://www.gnu.org/licenses/gpl-3.0.html";
const HARDWARE_URL = "https://meshtastic.org/docs/hardware/devices/";

// Set at build time by vite.config.ts, as in the footer.
const VERSION = String(import.meta.env.VITE_VERSION ?? "");
const COMMIT = String(import.meta.env.VITE_COMMIT_HASH ?? "").slice(0, 7);

const ExternalLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-help font-medium text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
  >
    {children}
    <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
  </a>
);

/** Android's About screen: versions, project links and legal notices. */
export const About = (_props: ConfigProps) => {
  const { t } = useTranslation("ui");
  const radio = useRadioInfo();
  const version = [VERSION, COMMIT && `#${COMMIT}`].filter(Boolean).join(" ");
  const notReported = t("firmwareSection.notReported", { ns: "config" });

  return (
    <SettingsSections>
      <SettingsGroup title={t("aboutSection.versionsCard", { ns: "config" })}>
        <SettingRow
          kind="readonlyKey"
          label={t("aboutSection.webClient", { ns: "config" })}
          value={version || "-"}
          copyable={Boolean(version)}
        />
        <SettingRow
          kind="readonlyKey"
          label={t("aboutSection.radioFirmware", { ns: "config" })}
          value={radio.firmware ?? notReported}
          copyable={radio.firmware !== undefined}
        />
        <SettingRow
          kind="readonlyKey"
          label={t("aboutSection.hardware", { ns: "config" })}
          value={radio.hardware ?? notReported}
          copyable={false}
        />
      </SettingsGroup>

      <SettingsGroup
        title={t("settingsPages.about.whatIs")}
        description={t("settingsPages.about.whatIsDescription")}
      >
        <SettingsRow
          label={t("settingsPages.about.github")}
          description={t("settingsPages.about.githubDescription")}
        >
          <ExternalLink href={GITHUB_URL}>
            github.com/meshtastic/web
          </ExternalLink>
        </SettingsRow>
        <SettingsRow label={t("settingsPages.about.website")}>
          <ExternalLink href={WEBSITE_URL}>meshtastic.org</ExternalLink>
        </SettingsRow>
        <SettingsRow label={t("settingsPages.about.documentation")}>
          <ExternalLink href={DOCS_URL}>meshtastic.org/docs</ExternalLink>
        </SettingsRow>
        <SettingsRow
          label={t("settingsPages.about.needHardware")}
          description={t("settingsPages.about.needHardwareDescription")}
        >
          <ExternalLink href={HARDWARE_URL}>
            {t("settingsPages.about.devices")}
          </ExternalLink>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title={t("aboutSection.legalCard", { ns: "config" })}>
        <SettingsRow
          label={t("settingsPages.about.license")}
          description={t("settingsPages.about.licenseNotice")}
        >
          <ExternalLink href={LICENSE_URL}>
            {t("settingsPages.about.licenseDescription")}
          </ExternalLink>
        </SettingsRow>
        <SettingsBlock>
          <p className="m-0 text-help text-muted">
            {t("settingsPages.about.copyright")}{" "}
            <ExternalLink href={LEGAL_URL}>
              meshtastic.org/docs/legal
            </ExternalLink>
          </p>
        </SettingsBlock>
      </SettingsGroup>
    </SettingsSections>
  );
};
