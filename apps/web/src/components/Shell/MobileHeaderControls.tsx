import { IconButton } from "@components/UI/IconButton.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import { useAppStore } from "@core/stores";
import { SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DeviceMenu } from "./DeviceMenu.tsx";
import { presenceForState } from "./deviceSummary.ts";
import { stateLabelKeys } from "./shellLabels.ts";
import { useDeviceSummary } from "./useDeviceSummary.ts";

/**
 * Narrow-layout header controls standing in for the rail: the command menu
 * and the device pill (avatar, status dot, voltage) that opens the device
 * menu.
 */
export const MobileHeaderControls = () => {
  const { t } = useTranslation("ui");
  const summary = useDeviceSummary();
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const label = t("shell.deviceWithStatus", {
    name: summary.name,
    status: t(stateLabelKeys[summary.state]),
  });

  return (
    <div className="flex shrink-0 items-center gap-1">
      <IconButton
        aria-label={t("shell.commandMenu")}
        icon={<SearchIcon className="size-5" />}
        size="touch"
        onClick={() => setCommandPaletteOpen(true)}
      />
      <DeviceMenu side="bottom" align="end">
        {/* 44px touch target around the 36px pill. */}
        <button
          type="button"
          aria-label={label}
          className="group flex h-11 cursor-pointer items-center rounded-full focus-visible:outline-none"
        >
          <span className="flex h-9 items-center gap-2 rounded-full border border-control bg-app pr-3 pl-0.5 text-help font-medium text-primary group-hover:bg-raised group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus">
            <NodeAvatar
              initials={summary.initials}
              tone={{ kind: "device" }}
              size="xs"
            />
            <StatusDot
              status={presenceForState[summary.state]}
              size="sm"
              label={null}
            />
            {summary.voltage
              ? t("shell.volts", { value: summary.voltage })
              : null}
          </span>
        </button>
      </DeviceMenu>
    </div>
  );
};
