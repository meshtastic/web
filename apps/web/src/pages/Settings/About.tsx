import {
  SettingsGroup,
  SettingsRow,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { type ConfigProps, SettingsCard } from "./SettingsTabs.tsx";

const GITHUB_URL = "https://github.com/meshtastic/web";
const WEBSITE_URL = "https://meshtastic.org";
const DOCS_URL = "https://meshtastic.org/docs/";
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
    className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 text-slate-900 dark:text-slate-200"
  >
    {children}
    <ExternalLinkIcon className="size-3.5" aria-hidden />
  </a>
);

/** Android's About screen. */
export const About = (_props: ConfigProps) => {
  const { t } = useTranslation("ui");
  const version = [VERSION, COMMIT && `#${COMMIT}`].filter(Boolean).join(" ");

  return (
    <SettingsCard>
      <SettingsSections>
        <SettingsGroup
          title={t("settingsPages.about.whatIs")}
          description={t("settingsPages.about.whatIsDescription")}
        />

        <SettingsGroup title={t("settingsPages.about.app")}>
          <SettingsRow
            label={t("settingsPages.about.github")}
            description={t("settingsPages.about.githubDescription")}
          >
            <ExternalLink href={GITHUB_URL}>
              github.com/meshtastic/web
            </ExternalLink>
          </SettingsRow>
          <SettingsRow label={t("settingsPages.about.version")}>
            <span className="font-mono text-sm">{version || "-"}</span>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title={t("settingsPages.about.project")}>
          <SettingsRow label={t("settingsPages.about.website")}>
            <ExternalLink href={WEBSITE_URL}>meshtastic.org</ExternalLink>
          </SettingsRow>
          <SettingsRow label={t("settingsPages.about.documentation")}>
            <ExternalLink href={DOCS_URL}>meshtastic.org/docs</ExternalLink>
          </SettingsRow>
          <SettingsRow label={t("settingsPages.about.license")}>
            <ExternalLink href={LICENSE_URL}>
              {t("settingsPages.about.licenseDescription")}
            </ExternalLink>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup
          title={t("settingsPages.about.needHardware")}
          description={t("settingsPages.about.needHardwareDescription")}
        >
          <ExternalLink href={HARDWARE_URL}>
            {t("settingsPages.about.devices")}
          </ExternalLink>
        </SettingsGroup>

        <div className="space-y-1 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Subtle>{t("settingsPages.about.copyright")}</Subtle>
          <Subtle>{t("settingsPages.about.licenseNotice")}</Subtle>
        </div>
      </SettingsSections>
    </SettingsCard>
  );
};
