import {
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  PlugZapIcon,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import type { DeviceMetrics } from "./types.ts";

type BatteryStatusKey = keyof typeof BATTERY_STATUS;

interface BatteryStatusProps {
  deviceMetrics?: DeviceMetrics | null;
}

interface StatusConfig {
  Icon: React.ElementType;
  className: string;
  text: string;
}

const BATTERY_STATUS = {
  PLUGGED_IN: "PLUGGED_IN",
  FULL: "FULL",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export const getBatteryStatus = (level: number): BatteryStatusKey => {
  if (level > 100) {
    return BATTERY_STATUS.PLUGGED_IN;
  }
  if (level > 80) {
    return BATTERY_STATUS.FULL;
  }
  if (level > 20) {
    return BATTERY_STATUS.MEDIUM;
  }
  return BATTERY_STATUS.LOW;
};

const BatteryStatus: React.FC<BatteryStatusProps> = ({ deviceMetrics }) => {
  const { t } = useTranslation();

  if (
    deviceMetrics?.batteryLevel === undefined ||
    deviceMetrics?.batteryLevel === null
  ) {
    return null;
  }

  const { batteryLevel } = deviceMetrics;

  const statusKey = getBatteryStatus(batteryLevel);

  const statusConfigMap: Record<BatteryStatusKey, StatusConfig> = {
    [BATTERY_STATUS.PLUGGED_IN]: {
      Icon: PlugZapIcon,
      className: "text-gray-500",
      text: t("batteryStatus.pluggedIn"),
    },
    [BATTERY_STATUS.FULL]: {
      Icon: BatteryFullIcon,
      className: "text-green-500",
      text: t("batteryStatus.charging", { level: batteryLevel }),
    },
    [BATTERY_STATUS.MEDIUM]: {
      Icon: BatteryMediumIcon,
      className: "text-yellow-500",
      text: t("batteryStatus.charging", { level: batteryLevel }),
    },
    [BATTERY_STATUS.LOW]: {
      Icon: BatteryLowIcon,
      className: "text-red-500",
      text: t("batteryStatus.charging", { level: batteryLevel }),
    },
  };

  // 3. Use the key to get the current state configuration
  const {
    Icon: BatteryIcon,
    className: iconClassName,
    text: statusText,
  } = statusConfigMap[statusKey];

  return (
    <div className="flex items-center gap-1 mt-0.5">
      <BatteryIcon size={22} className={iconClassName} />
      {statusText}
    </div>
  );
};

export default BatteryStatus;
