import React from "react";
import {
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  PlugZapIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { DeviceMetrics } from "./types.ts";

interface BatteryStateConfig {
  condition: (level: number) => boolean;
  Icon: React.ElementType;
  className: string;
  text: (level: number) => string;
}

interface BatteryStatusProps {
  deviceMetrics?: DeviceMetrics | null;
}

const getBatteryStates = (
  t: (key: string, options?: object) => string,
): BatteryStateConfig[] => {
  return [
    {
      condition: (level) => level > 100,
      Icon: PlugZapIcon,
      className: "text-gray-500",
      text: () => t("batteryStatus.pluggedIn"),
    },
    {
      condition: (level) => level > 80,
      Icon: BatteryFullIcon,
      className: "text-green-500",
      text: (level) => t("batteryStatus.charging", { level }),
    },
    {
      condition: (level) => level > 20,
      Icon: BatteryMediumIcon,
      className: "text-yellow-500",
      text: (level) => t("batteryStatus.charging", { level }),
    },
    {
      condition: () => true,
      Icon: BatteryLowIcon,
      className: "text-red-500",
      text: (level) => t("batteryStatus.charging", { level }),
    },
  ];
};

const getBatteryState = (
  level: number,
  batteryStates: BatteryStateConfig[],
) => {
  return batteryStates.find((state) => state.condition(level));
};

const BatteryStatus: React.FC<BatteryStatusProps> = ({ deviceMetrics }) => {
  if (
    deviceMetrics?.batteryLevel === undefined ||
    deviceMetrics?.batteryLevel === null
  ) {
    return null;
  }

  const { t } = useTranslation();
  const batteryStates = getBatteryStates(t);

  const { batteryLevel } = deviceMetrics;
  const currentState = getBatteryState(batteryLevel, batteryStates) ??
    batteryStates[batteryStates.length - 1];

  const BatteryIcon = currentState.Icon;
  const iconClassName = currentState.className;
  const statusText = currentState.text(batteryLevel);

  return (
    <div
      className="flex items-center gap-1 mt-0.5 "
      aria-label={t("batteryStatus.title")}
    >
      <BatteryIcon size={22} className={iconClassName} />
      {statusText}
    </div>
  );
};

export default BatteryStatus;
