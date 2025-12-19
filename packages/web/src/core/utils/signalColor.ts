import { Protobuf } from "@meshtastic/core";

export const LINE_COLOR = {
  GOOD: "#00ff00",
  FAIR: "#ffe600",
  BAD: "#f7931a",
};

export type SignalGrade = "Good" | "Fair" | "Bad";

export interface SignalGradeResult {
  grade: SignalGrade;
  bars: 1 | 2 | 3 | 4 | 5;
}

type ModemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const ModemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset;

/**
 * Returns the SNR limit based on modem preset.
 * Different presets have different sensitivity thresholds.
 */
export function getSnrLimit(preset: ModemPreset): number {
  switch (preset) {
    case ModemPreset.LONG_SLOW:
    case ModemPreset.LONG_MODERATE:
    case ModemPreset.LONG_FAST:
      return -6.0;
    case ModemPreset.MEDIUM_SLOW:
    case ModemPreset.MEDIUM_FAST:
      return -5.5;
    case ModemPreset.SHORT_SLOW:
    case ModemPreset.SHORT_FAST:
    case ModemPreset.SHORT_TURBO:
      return -4.5;
    default:
      return -6.0;
  }
}

/**
 * Returns signal grade and bar count based on SNR, RSSI, and modem preset.
 * Uses the same logic as the Meshtastic firmware.
 */
export function getSignalGrade(
  snr: number,
  rssi: number,
  snrLimit: number,
): SignalGradeResult {
  if (snr > snrLimit && rssi > -10) {
    return { grade: "Good", bars: 5 };
  }
  if (snr > snrLimit && rssi > -20) {
    return { grade: "Good", bars: 4 };
  }
  if (snr > 0 && rssi > -50) {
    return { grade: "Good", bars: 3 };
  }
  if (snr > -10 && rssi > -100) {
    return { grade: "Fair", bars: 2 };
  }
  return { grade: "Bad", bars: 1 };
}

/**
 * Returns the color for a signal grade.
 */
export function getSignalColorForGrade(grade: SignalGrade): string {
  return LINE_COLOR[grade.toUpperCase() as keyof typeof LINE_COLOR];
}

/**
 * Returns signal color based on SNR value using simplified thresholds.
 * For more accurate grading, use getSignalGrade with the modem preset.
 */
export function getSignalColor(snr: number): string {
  if (snr > 0) {
    return LINE_COLOR.GOOD;
  }
  if (snr > -10) {
    return LINE_COLOR.FAIR;
  }
  return LINE_COLOR.BAD;
}
