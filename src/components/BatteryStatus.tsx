import React from "react";
import {
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  PlugZapIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";

interface DeviceMetrics {
  batteryLevel?: number | null;
  voltage?: number | null;
}

interface BatteryStatusProps {
  deviceMetrics?: DeviceMetrics | null;
}

interface BatteryStateConfig {
  condition: (level: number) => boolean;
  Icon: React.ElementType;
  className: string;
  text: (level: number) => string;
}

const getBatteryStates = (
  t: (key: string, options?: object) => string,
): BatteryStateConfig[] => {
  return [
    {
      condition: (level) => level > 100,
      Icon: PlugZapIcon,
      className: "text-gray-500",
      text: () => t("common_batteryStatus.pluggedIn"),
    },
    {
      condition: (level) => level > 80,
      Icon: BatteryFullIcon,
      className: "text-green-500",
      text: (level) => t("common_batteryStatus.charging", { level }),
    },
    {
      condition: (level) => level > 20,
      Icon: BatteryMediumIcon,
      className: "text-yellow-500",
      text: (level) => t("common_batteryStatus.charging", { level }),
    },
    {
      condition: () => true,
      Icon: BatteryLowIcon,
      className: "text-red-500",
      text: (level) => t("common_batteryStatus.charging", { level }),
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

  const { batteryLevel, voltage } = deviceMetrics;
  const currentState = getBatteryState(batteryLevel, batteryStates) ??
    batteryStates[batteryStates.length - 1];

  const BatteryIcon = currentState.Icon;
  const iconClassName = currentState.className;
  const statusText = currentState.text(batteryLevel);

  const voltageTitle = `${
    voltage?.toPrecision(3) ?? t("common_unknown_short")
  } ${t("common_unit_volts")}`;

  return (
    <div
      className="flex items-center gap-1 mt-0.5 text-gray-500"
      title={voltageTitle}
    >
      <BatteryIcon size={22} className={iconClassName} />
      <Subtle aria-label={t("common_batteryStatus.title")}>
        {statusText}
      </Subtle>
    </div>
  );
};

export default BatteryStatus;
