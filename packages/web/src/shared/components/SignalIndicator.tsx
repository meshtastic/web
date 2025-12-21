import { cn } from "@shared/utils/cn";
import {
  getSignalColorForGrade,
  getSignalGrade,
  getSnrLimit,
  type SignalGrade,
  type SignalGradeResult,
} from "@features/nodes/utils/signalColor";
import { Protobuf } from "@meshtastic/core";

interface SignalIndicatorProps {
  snr: number;
  rssi: number;
  modemPreset?: Protobuf.Config.Config_LoRaConfig_ModemPreset;
  showLabel?: boolean;
  className?: string;
}

/**
 * Signal bars component that displays 1-5 bars based on signal quality
 */
function SignalBars({
  bars,
  grade,
  className,
}: {
  bars: 1 | 2 | 3 | 4 | 5;
  grade: SignalGrade;
  className?: string;
}) {
  const color = getSignalColorForGrade(grade);

  return (
    <svg
      viewBox="0 0 20 16"
      fill="none"
      className={cn("h-4 w-5", className)}
      aria-label={`Signal strength: ${bars} bars`}
    >
      <title className="sr-only">Signal Indicator</title>
      {/* Bar 1 - always visible, shortest */}
      <rect
        x="0"
        y="12"
        width="3"
        height="4"
        rx="0.5"
        fill={bars >= 1 ? color : "currentColor"}
        opacity={bars >= 1 ? 1 : 0.2}
      />
      {/* Bar 2 */}
      <rect
        x="4.25"
        y="9"
        width="3"
        height="7"
        rx="0.5"
        fill={bars >= 2 ? color : "currentColor"}
        opacity={bars >= 2 ? 1 : 0.2}
      />
      {/* Bar 3 */}
      <rect
        x="8.5"
        y="6"
        width="3"
        height="10"
        rx="0.5"
        fill={bars >= 3 ? color : "currentColor"}
        opacity={bars >= 3 ? 1 : 0.2}
      />
      {/* Bar 4 */}
      <rect
        x="12.75"
        y="3"
        width="3"
        height="13"
        rx="0.5"
        fill={bars >= 4 ? color : "currentColor"}
        opacity={bars >= 4 ? 1 : 0.2}
      />
      {/* Bar 5 - tallest */}
      <rect
        x="17"
        y="0"
        width="3"
        height="16"
        rx="0.5"
        fill={bars >= 5 ? color : "currentColor"}
        opacity={bars >= 5 ? 1 : 0.2}
      />
    </svg>
  );
}

/**
 * Displays signal quality indicator with bars and optional label.
 * Uses the same grading logic as the Meshtastic firmware.
 */
export function SignalIndicator({
  snr,
  rssi,
  modemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset.LONG_FAST,
  showLabel = true,
  className,
}: SignalIndicatorProps) {
  const snrLimit = getSnrLimit(modemPreset);
  const { grade, bars } = getSignalGrade(snr, rssi, snrLimit);
  const color = getSignalColorForGrade(grade);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <SignalBars bars={bars} grade={grade} />
      {showLabel && (
        <span className="text-xs font-medium" style={{ color }}>
          {grade}
        </span>
      )}
    </div>
  );
}

/**
 * Returns signal grade result for use in custom displays
 */
export function useSignalGrade(
  snr: number,
  rssi: number,
  modemPreset: Protobuf.Config.Config_LoRaConfig_ModemPreset = Protobuf.Config
    .Config_LoRaConfig_ModemPreset.LONG_FAST,
): SignalGradeResult {
  const snrLimit = getSnrLimit(modemPreset);
  return getSignalGrade(snr, rssi, snrLimit);
}

export { SignalBars };
