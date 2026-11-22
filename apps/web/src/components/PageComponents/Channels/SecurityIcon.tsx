import { cn } from "@core/utils/cn.ts";
import {
  LockIcon,
  LockOpenIcon,
  type LucideIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SecurityState } from "./channelStaging.ts";

const SECURITY_STYLE: Record<
  SecurityState,
  { icon: LucideIcon; className: string; badge?: boolean }
> = {
  secure: { icon: LockIcon, className: "text-accent" },
  insecureNoPrecise: {
    icon: LockOpenIcon,
    className: "text-warning",
  },
  insecurePreciseOnly: {
    icon: LockOpenIcon,
    className: "text-danger",
  },
  insecurePreciseMqtt: {
    icon: LockOpenIcon,
    className: "text-danger",
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
          className="absolute -top-1.5 -right-1.5 fill-current text-warning"
        />
      )}
    </span>
  );
}
