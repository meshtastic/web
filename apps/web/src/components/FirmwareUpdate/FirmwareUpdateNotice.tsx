import { buttonVariants } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import type { FirmwareUpdateNudge } from "@core/firmware/useFirmwareUpdateNotice.ts";
import { cn } from "@core/utils/cn.ts";
import { ExternalLinkIcon, MonitorDownIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export interface FirmwareUpdateNoticeProps {
  nudge: FirmwareUpdateNudge;
  className?: string;
}

/**
 * The connected radio is behind the latest stable firmware. An update
 * suggestion, not a warning: neutral surface, accent update icon (the
 * lucide match for Material `system_update_alt`), no alert role. It stays
 * until the radio is current, another radio connects, or it disconnects.
 */
export const FirmwareUpdateNotice = ({
  nudge,
  className,
}: FirmwareUpdateNoticeProps) => {
  const { t } = useTranslation("connections");
  const hintId = useId();
  const { currentVersion, stableVersion } = nudge.notice;

  return (
    <Callout
      tone="info"
      title={t("firmwareUpdate.title")}
      icon={<MonitorDownIcon className="size-4 text-accent" />}
      className={className}
      data-testid="firmware-update-notice"
    >
      <p>
        {t("firmwareUpdate.message", {
          current: currentVersion,
          stable: stableVersion,
        })}
      </p>
      <a
        href={nudge.flasherUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={hintId}
        className={cn(
          buttonVariants({ variant: "primary", size: "sm" }),
          "mt-2.5 gap-1.5",
        )}
      >
        <MonitorDownIcon aria-hidden="true" className="size-4" />
        {t("firmwareUpdate.action")}
        <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
      </a>
      <span id={hintId} className="sr-only">
        {t("firmwareUpdate.actionHint", { stable: stableVersion })}
      </span>
    </Callout>
  );
};
