export const SNR_THRESHOLD = {
  GOOD: -7,
  FAIR: -15,
};

export const RSSI_THRESHOLD = {
  GOOD: -115,
  FAIR: -126,
};

export const LINE_COLOR = {
  GOOD: "#00ff00",
  FAIR: "#ffe600",
  BAD: "#f7931a",
};

export const getSignalColor = (snr: number, rssi?: number): string => {
  if (
    snr > SNR_THRESHOLD.GOOD &&
    (rssi == null || rssi > RSSI_THRESHOLD.GOOD)
  ) {
    return LINE_COLOR.GOOD;
  }
  if (
    snr > SNR_THRESHOLD.FAIR &&
    (rssi == null || rssi > RSSI_THRESHOLD.FAIR)
  ) {
    return LINE_COLOR.FAIR;
  }
  return LINE_COLOR.BAD;
};
