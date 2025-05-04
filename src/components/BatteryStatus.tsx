import React from "react";
import {
  BatteryFullIcon,
  BatteryLowIcon,
  BatteryMediumIcon,
  PlugZapIcon,
} from "lucide-react";
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

const batteryStates: BatteryStateConfig[] = [
  {
    condition: (level) => level > 100,
    Icon: PlugZapIcon,
    className: "text-gray-500",
    text: () => "Plugged in",
  },
  {
    condition: (level) => level > 80,
    Icon: BatteryFullIcon,
    className: "text-green-500",
    text: (level) => `${level}% charging`,
  },
  {
    condition: (level) => level > 20,
    Icon: BatteryMediumIcon,
    className: "text-yellow-500",
    text: (level) => `${level}% charging`,
  },
  {
    condition: () => true,
    Icon: BatteryLowIcon,
    className: "text-red-500",
    text: (level) => `${level}% charging`,
  },
];

const getBatteryState = (level: number) => {
  return batteryStates.find((state) => state.condition(level));
};

const BatteryStatus: React.FC<BatteryStatusProps> = ({ deviceMetrics }) => {
  if (
    deviceMetrics?.batteryLevel === undefined ||
    deviceMetrics?.batteryLevel === null
  ) {
    return null;
  }

  const { batteryLevel, voltage } = deviceMetrics;
  const currentState = getBatteryState(batteryLevel) ??
    batteryStates[batteryStates.length - 1];

  const BatteryIcon = currentState.Icon;
  const iconClassName = currentState.className;
  const statusText = currentState.text(batteryLevel);

  const voltageTitle = `${voltage?.toPrecision(3) ?? "Unknown"} volts`;

  return (
    <div
      className="flex items-center gap-1 mt-0.5 text-gray-500"
      title={voltageTitle}
    >
      <BatteryIcon size={22} className={iconClassName} />
      <Subtle aria-label="Battery">
        {statusText}
      </Subtle>
    </div>
  );
};

export default BatteryStatus;
