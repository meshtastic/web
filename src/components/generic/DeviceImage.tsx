export interface DeviceImageProps {
  deviceType: string;
  className?: React.HTMLAttributes<HTMLImageElement>["className"];
}

const hardwareModelToFilename: { [key: string]: string } = {
  DIY_V1: "diy.svg",
  NANO_G2_ULTRA: "nano-g2-ultra.svg",
  TBEAM: "tbeam.svg",
  HELTEC_HT62: "heltec-ht62-esp32c3-sx1262.svg",
  RPI_PICO: "pico.svg",
  T_DECK: "t-deck.svg",
  HELTEC_MESH_NODE_T114: "heltec-mesh-node-t114.svg",
  HELTEC_MESH_NODE_T114_CASE: "heltec-mesh-node-t114-case.svg",
  HELTEC_V3: "heltec-v3.svg",
  HELTEC_V3_CASE: "heltec-v3-case.svg",
  HELTEC_VISION_MASTER_E213: "heltec-vision-master-e213.svg",
  HELTEC_VISION_MASTER_E290: "heltec-vision-master-e290.svg",
  HELTEC_VISION_MASTER_T190: "heltec-vision-master-t190.svg",
  HELTEC_WIRELESS_PAPER: "heltec-wireless-paper.svg",
  HELTEC_WIRELESS_PAPER_V1_0: "heltec-wireless-paper-V1_0.svg",
  HELTEC_WIRELESS_TRACKER: "heltec-wireless-tracker.svg",
  HELTEC_WIRELESS_TRACKER_V1_0: "heltec-wireless-tracker-V1-0.svg",
  HELTEC_WSL_V3: "heltec-wsl-v3.svg",
  TLORA_C6: "tlora-c6.svg",
  TLORA_T3_S3: "tlora-t3s3-v1.svg",
  TLORA_T3_S3_EPAPER: "tlora-t3s3-epaper.svg",
  TLORA_V2: "tlora-v2-1-1_6.svg",
  TLORA_V2_1_1P6: "tlora-v2-1-1_6.svg",
  TLORA_V2_1_1P8: "tlora-v2-1-1_8.svg",
  RAK11310: "rak11310.svg",
  RAK2560: "rak2560.svg",
  RAK4631: "rak4631.svg",
  RAK4631_CASE: "rak4631_case.svg",
  WIO_WM1110: "wio-tracker-wm1110.svg",
  WM1110_DEV_KIT: "wm1110_dev_kit.svg",
  STATION_G2: "station-g2.svg",
  TBEAM_V0P7: "tbeam-s3-core.svg",
  T_ECHO: "t-echo.svg",
  TRACKER_T1000_E: "tracker-t1000-e.svg",
  T_WATCH_S3: "t-watch-s3.svg",
  SEEED_XIAO_S3: "seeed-xiao-s3.svg",
  SENSECAP_INDICATOR: "seeed-sensecap-indicator.svg",
  PROMICRO: "promicro.svg",
  RPIPICOW: "rpipicow.svg",
  UNKNOWN: "unknown.svg",
};

export const DeviceImage = ({ deviceType, className }: DeviceImageProps) => {
  const getPath = (device: string) => `/devices/${device}`;
  const device = hardwareModelToFilename[deviceType] || "unknown.svg";
  return <img className={className} src={getPath(device)} alt={device} />;
};
