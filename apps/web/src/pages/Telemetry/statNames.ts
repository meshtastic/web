/**
 * Human-readable labels for telemetry stat fields.
 *
 * Keys are the camelCase protobuf field names as they appear on decoded
 * telemetry payloads (e.g. `numRxDupe`, `uptimeSeconds`). Fields that are
 * shared across several telemetry kinds (uptimeSeconds, channelUtilization,
 * airUtilTx, temperature, voltage, current) map to a single label since the
 * meaning is the same in every kind.
 *
 * Sourced from meshtastic/telemetry.proto.
 */
const STAT_DISPLAY_NAMES: Record<string, string> = {
  // DeviceMetrics
  batteryLevel: "Battery Level (%)",
  voltage: "Voltage (V)",
  channelUtilization: "Channel Utilization (%)",
  airUtilTx: "Air Utilization TX (%)",
  uptimeSeconds: "Uptime (s)",

  // EnvironmentMetrics
  temperature: "Temperature (°C)",
  relativeHumidity: "Relative Humidity (%)",
  barometricPressure: "Barometric Pressure (hPa)",
  gasResistance: "Gas Resistance (MΩ)",
  current: "Current (A)",
  iaq: "IAQ",
  distance: "Distance (mm)",
  lux: "Illuminance (lux)",
  whiteLux: "White Light (lux)",
  irLux: "Infrared (lux)",
  uvLux: "Ultraviolet (lux)",
  windDirection: "Wind Direction (°)",
  windSpeed: "Wind Speed (m/s)",
  weight: "Weight (kg)",
  windGust: "Wind Gust (m/s)",
  windLull: "Wind Lull (m/s)",
  radiation: "Radiation (µR/h)",
  rainfall1h: "Rainfall — 1h (mm)",
  rainfall24h: "Rainfall — 24h (mm)",
  soilMoisture: "Soil Moisture (%)",
  soilTemperature: "Soil Temperature (°C)",
  oneWireTemperature: "One-Wire Temperature (°C)",

  // PowerMetrics
  ch1Voltage: "Channel 1 Voltage (V)",
  ch1Current: "Channel 1 Current (A)",
  ch2Voltage: "Channel 2 Voltage (V)",
  ch2Current: "Channel 2 Current (A)",
  ch3Voltage: "Channel 3 Voltage (V)",
  ch3Current: "Channel 3 Current (A)",
  ch4Voltage: "Channel 4 Voltage (V)",
  ch4Current: "Channel 4 Current (A)",
  ch5Voltage: "Channel 5 Voltage (V)",
  ch5Current: "Channel 5 Current (A)",
  ch6Voltage: "Channel 6 Voltage (V)",
  ch6Current: "Channel 6 Current (A)",
  ch7Voltage: "Channel 7 Voltage (V)",
  ch7Current: "Channel 7 Current (A)",
  ch8Voltage: "Channel 8 Voltage (V)",
  ch8Current: "Channel 8 Current (A)",

  // AirQualityMetrics
  pm10Standard: "PM1.0 Standard (µg/m³)",
  pm25Standard: "PM2.5 Standard (µg/m³)",
  pm100Standard: "PM10.0 Standard (µg/m³)",
  pm10Environmental: "PM1.0 Environmental (µg/m³)",
  pm25Environmental: "PM2.5 Environmental (µg/m³)",
  pm100Environmental: "PM10.0 Environmental (µg/m³)",
  particles03um: "Particles >0.3µm (#/0.1L)",
  particles05um: "Particles >0.5µm (#/0.1L)",
  particles10um: "Particles >1.0µm (#/0.1L)",
  particles25um: "Particles >2.5µm (#/0.1L)",
  particles50um: "Particles >5.0µm (#/0.1L)",
  particles100um: "Particles >10.0µm (#/0.1L)",
  co2: "CO₂ (ppm)",
  co2Temperature: "CO₂ Sensor Temp (°C)",
  co2Humidity: "CO₂ Sensor Humidity (%)",
  formFormaldehyde: "Formaldehyde (ppb)",
  formHumidity: "Formaldehyde Sensor Humidity (%)",
  formTemperature: "Formaldehyde Sensor Temp (°C)",
  pm40Standard: "PM4.0 Standard (µg/m³)",
  particles40um: "Particles >4.0µm (#/0.1L)",
  pmTemperature: "PM Sensor Temp (°C)",
  pmHumidity: "PM Sensor Humidity (%)",
  pmVocIdx: "PM VOC Index",
  pmNoxIdx: "PM NOx Index",
  particlesTps: "Typical Particle Size (µm)",

  // LocalStats
  numPacketsTx: "Packets Sent",
  numPacketsRx: "Packets Received",
  numPacketsRxBad: "Bad Packets Received",
  numOnlineNodes: "Nodes Online",
  numTotalNodes: "Total Nodes",
  numRxDupe: "Duplicate Packets Received",
  numTxRelay: "Packets Relayed",
  numTxRelayCanceled: "Relays Canceled",
  heapTotalBytes: "Heap Total (bytes)",
  heapFreeBytes: "Heap Free (bytes)",
  numTxDropped: "Packets Dropped — TX Queue Full",
  noiseFloor: "Noise Floor (dBm)",

  // TrafficManagementStats
  packetsInspected: "Packets Inspected",
  positionDedupDrops: "Position Dedup Drops",
  nodeinfoCacheHits: "NodeInfo Cache Hits",
  rateLimitDrops: "Rate Limit Drops",
  unknownPacketDrops: "Unknown Packet Drops",
  hopExhaustedPackets: "Hop-Exhausted Packets",
  routerHopsPreserved: "Router Hops Preserved",

  // HealthMetrics
  heartBpm: "Heart Rate (bpm)",
  spO2: "SpO₂ (%)",

  // HostMetrics
  freememBytes: "Free Memory (bytes)",
  diskfree1Bytes: "Disk Free — / (bytes)",
  diskfree2Bytes: "Disk Free — 2 (bytes)",
  diskfree3Bytes: "Disk Free — 3 (bytes)",
  load1: "Load Average (1m)",
  load5: "Load Average (5m)",
  load15: "Load Average (15m)",

  // Node-level metrics (from the Nodes page, recorded in node_metrics)
  snr: "SNR (dB)",
  hopsAway: "Hops Away",
  lastHeard: "Last Heard (epoch s)",
};

/**
 * Translates a telemetry stat field name (e.g. `numRxDupe`) to a human-readable
 * label. Falls back to the original name when no translation is available.
 */
export function translateStatName(name: string): string {
  return STAT_DISPLAY_NAMES[name] ?? name;
}
