import { rateSignalQuality } from "./signalQuality.ts";

export const LINE_COLOR = {
  GOOD: "#00ff00",
  FAIR: "#ffe600",
  BAD: "#f7931a",
};

export const getSignalColor = (
  snr: number,
  rssi?: number,
  preset?: number | string | null,
): string => {
  // Preset-relative quality per meshtastic/web#1241; "none" (no chance of
  // demodulation) renders as BAD on the map.
  const quality = rateSignalQuality(snr, preset, rssi);
  if (quality === "good") return LINE_COLOR.GOOD;
  if (quality === "fair") return LINE_COLOR.FAIR;
  return LINE_COLOR.BAD;
};
