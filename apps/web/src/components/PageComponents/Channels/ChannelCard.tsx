import { cn } from "@core/utils/cn.ts";
import type { Protobuf } from "@meshtastic/sdk";
import {
  CloudDownloadIcon,
  CloudUploadIcon,
  LockIcon,
  LockOpenIcon,
  type LucideIcon,
  MapPinIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { type SecurityState, securityState } from "./channelStaging.ts";

const SECURITY_STYLE: Record<
  SecurityState,
  { icon: LucideIcon; className: string; badge?: boolean }
> = {
  secure: { icon: LockIcon, className: "text-green-600 dark:text-green-500" },
  insecureNoPrecise: {
    icon: LockOpenIcon,
    className: "text-yellow-500 dark:text-yellow-400",
  },
  insecurePreciseOnly: {
    icon: LockOpenIcon,
    className: "text-red-600 dark:text-red-500",
  },
  insecurePreciseMqtt: {
    icon: LockOpenIcon,
    className: "text-red-600 dark:text-red-500",
    badge: true,
  },
};

/** Lock icon for a channel's encryption, as on Android's SecurityIcon. */
export function SecurityIcon({
  state,
  className,
}: {
  state: SecurityState;
  className?: string;
}) {
  const { t } = useTranslation("channels");
  const { icon: Icon, className: color, badge } = SECURITY_STYLE[state];
  const label = `${t("security.label")}: ${t(`security.${state}.label`)}`;
  return (
    <span title={label} className={cn("relative inline-flex", className)}>
      <Icon size={18} className={color} aria-label={label} />
      {badge && (
        <TriangleAlertIcon
          size={11}
          aria-hidden
          className="absolute -top-1.5 -right-1.5 fill-white text-yellow-500 dark:fill-slate-800"
        />
      )}
    </span>
  );
}

function FeatureIcon({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span title={label} className="inline-flex">
      <Icon size={18} aria-label={label} />
    </span>
  );
}

export interface ChannelCardProps {
  channel: Pick<Protobuf.Channel.Channel, "index" | "settings">;
  title: string;
  sharesLocation: boolean;
  /** The channel has staged changes that are not saved yet. */
  dirty: boolean;
  onEdit: () => void;
  /** Omitted for the primary channel, which can't be deleted. */
  onDelete?: () => void;
}

/** One channel in the list (Android's ChannelCard). */
export function ChannelCard({
  channel,
  title,
  sharesLocation,
  dirty,
  onEdit,
  onDelete,
}: ChannelCardProps) {
  const { t } = useTranslation("channels");
  const isPrimary = channel.index === 0;
  const settings = channel.settings;

  return (
    <li className="flex items-center rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("list.edit", { name: title })}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:hover:bg-slate-700/50"
      >
        <span
          className={cn(
            "relative inline-flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-medium",
            isPrimary
              ? "border-green-600 text-green-700 dark:border-green-500 dark:text-green-400"
              : "border-slate-300 dark:border-slate-500",
          )}
        >
          {channel.index}
          {dirty && (
            <span className="absolute -top-1 -right-1 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-25" />
              <span className="relative inline-flex size-2.5 rounded-full bg-sky-500" />
            </span>
          )}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-medium",
            isPrimary && "text-green-700 dark:text-green-400",
          )}
        >
          {title}
        </span>
        <span className="flex shrink-0 items-center gap-2.5 text-slate-600 dark:text-slate-300">
          {sharesLocation && (
            <FeatureIcon icon={MapPinIcon} label={t("icons.location.label")} />
          )}
          {settings?.uplinkEnabled && (
            <FeatureIcon
              icon={CloudUploadIcon}
              label={t("icons.uplink.label")}
            />
          )}
          {settings?.downlinkEnabled && (
            <FeatureIcon
              icon={CloudDownloadIcon}
              label={t("icons.downlink.label")}
            />
          )}
          <SecurityIcon state={securityState(settings)} />
        </span>
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("list.delete", { name: title })}
          title={t("list.delete", { name: title })}
          className="mr-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-red-400"
        >
          <XIcon size={18} aria-hidden />
        </button>
      ) : (
        <span className="mr-1 size-9 shrink-0" aria-hidden />
      )}
    </li>
  );
}
