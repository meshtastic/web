import type { TelemetryKind, TelemetryReading } from "@meshtastic/sdk";

/**
 * Pure helpers that turn SDK telemetry readings into display rows for the
 * node details "Sensors" section.
 *
 * Field labels are i18n keys (resolved by the component under
 * `dialog:nodeDetails.telemetry.field.<kind>.<label>`); values come back
 * formatted with their unit. Unit symbols are locale-independent (SI or
 * the unit the protobuf comment documents), so they stay in code.
 */

export type DisplayedTelemetryKind = Exclude<
  NonNullable<TelemetryKind>,
  "deviceMetrics"
>;

/** Order the sections appear in. deviceMetrics has its own section. */
export const TELEMETRY_KIND_ORDER: readonly DisplayedTelemetryKind[] = [
  "environmentMetrics",
  "airQualityMetrics",
  "soilWaterMetrics",
  "powerMetrics",
  "healthMetrics",
  "localStats",
  "trafficManagementStats",
  "hostMetrics",
];

export interface TelemetryField {
  /** Stable key, the protobuf field name (camelCase). */
  id: string;
  /** i18n key relative to `nodeDetails.telemetry.field.`. */
  labelKey: string;
  labelOptions?: Record<string, number>;
  /** Formatted value including its unit. */
  value: string;
}

export interface TelemetrySection {
  kind: DisplayedTelemetryKind;
  time: Date;
  fields: TelemetryField[];
}

const NO_SPACE_UNITS = new Set(["%", "°"]);

export function formatNumber(
  value: number,
  digits: number,
  locale = "en",
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** `21.5 °C`, `45%`, `1013.2 hPa`; a bare number when there is no unit. */
export function formatMeasurement(
  value: number,
  unit: string | undefined,
  digits: number,
  locale = "en",
): string {
  const number = formatNumber(value, digits, locale);
  if (!unit) return number;
  return NO_SPACE_UNITS.has(unit) ? `${number}${unit}` : `${number} ${unit}`;
}

const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB"];

export function formatBytes(bytes: number | bigint, locale = "en"): string {
  let value = Number(bytes);
  let unit = 0;
  while (Math.abs(value) >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return formatMeasurement(value, BYTE_UNITS[unit], unit === 0 ? 0 : 1, locale);
}

/** `3d 4h 5m 6s`, leading zero units dropped: `5m 6s`, `0s`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const parts: Array<[number, string]> = [
    [Math.floor(seconds / 86400), "d"],
    [Math.floor((seconds % 86400) / 3600), "h"],
    [Math.floor((seconds % 3600) / 60), "m"],
    [seconds % 60, "s"],
  ];
  const first = parts.findIndex(([n]) => n > 0);
  if (first === -1) return "0s";
  return parts
    .slice(first)
    .map(([n, suffix]) => `${n}${suffix}`)
    .join(" ");
}

/** Raw status register, e.g. `0x0010`. */
export function formatHexFlags(value: number): string {
  return `0x${(value >>> 0).toString(16).toUpperCase().padStart(4, "0")}`;
}

/**
 * The latest reading of each variant, picked by `time` (history is not
 * sorted: readings hydrated from storage are appended after live ones).
 * Readings without a variant or a decoded value are ignored.
 */
export function latestReadingPerKind(
  history: readonly TelemetryReading[],
): Map<NonNullable<TelemetryKind>, TelemetryReading> {
  const latest = new Map<NonNullable<TelemetryKind>, TelemetryReading>();
  for (const reading of history) {
    if (!reading.kind || reading.value === undefined) continue;
    const current = latest.get(reading.kind);
    if (!current || reading.time.getTime() >= current.time.getTime()) {
      latest.set(reading.kind, reading);
    }
  }
  return latest;
}

type Format = (value: number, locale: string) => string;

interface FieldSpec {
  id: string;
  label?: string;
  labelOptions?: Record<string, number>;
  format: Format;
}

const measure =
  (unit: string | undefined, digits: number): Format =>
  (value, locale) =>
    formatMeasurement(value, unit, digits, locale);

const count: Format = (value, locale) => formatNumber(value, 0, locale);
const duration: Format = (value) => formatDuration(value);
const bytes: Format = (value, locale) => formatBytes(value, locale);

const field = (id: string, format: Format, label?: string): FieldSpec => ({
  id,
  format,
  label,
});

const channelFields = (
  idFor: (channel: number) => string,
  label: string,
  format: Format,
  channels: readonly number[],
): FieldSpec[] =>
  channels.map((channel) => ({
    id: idFor(channel),
    label,
    labelOptions: { channel },
    format,
  }));

const CH_0_TO_7 = [0, 1, 2, 3, 4, 5, 6, 7];

const CELSIUS = measure("°C", 1);
const PERCENT = measure("%", 1);
const VOLTS = measure("V", 2);
// Current is reported in mA by the INA family of sensors the firmware reads.
const MILLIAMPS = measure("mA", 1);
const MICROGRAMS_PER_M3 = measure("µg/m³", 0);
const PARTICLES = measure("/0.1 L", 0);

const FIELD_SPECS: Record<DisplayedTelemetryKind, FieldSpec[]> = {
  environmentMetrics: [
    field("temperature", CELSIUS),
    field("relativeHumidity", PERCENT),
    field("barometricPressure", measure("hPa", 1)),
    field("gasResistance", measure("MΩ", 2)),
    field("iaq", count),
    field("voltage", VOLTS),
    field("current", MILLIAMPS),
    field("lux", measure("lx", 0)),
    field("whiteLux", measure("lx", 0)),
    field("irLux", measure("lx", 0)),
    field("uvLux", measure("lx", 0)),
    field("windDirection", measure("°", 0)),
    field("windSpeed", measure("m/s", 1)),
    field("windGust", measure("m/s", 1)),
    field("windLull", measure("m/s", 1)),
    field("rainfall1h", measure("mm", 1)),
    field("rainfall24h", measure("mm", 1)),
    field("lightningStrikeCount1h", count),
    field("lightningDistanceKm", measure("km", 0)),
    field("soilMoisture", measure("%", 0)),
    field("soilTemperature", CELSIUS),
    field("distance", measure("mm", 0)),
    field("weight", measure("kg", 2)),
    field("radiation", measure("µR/h", 2)),
    ...channelFields(
      (ch) => `oneWireTemperatureCh${ch}`,
      "oneWireTemperature",
      CELSIUS,
      CH_0_TO_7,
    ),
    ...channelFields(
      (ch) => `adcVoltageCh${ch}`,
      "adcVoltage",
      measure("V", 3),
      CH_0_TO_7,
    ),
  ],
  airQualityMetrics: [
    field("pm10Standard", MICROGRAMS_PER_M3),
    field("pm25Standard", MICROGRAMS_PER_M3),
    field("pm40Standard", MICROGRAMS_PER_M3),
    field("pm100Standard", MICROGRAMS_PER_M3),
    field("pm10Environmental", MICROGRAMS_PER_M3),
    field("pm25Environmental", MICROGRAMS_PER_M3),
    field("pm100Environmental", MICROGRAMS_PER_M3),
    field("particles03um", PARTICLES),
    field("particles05um", PARTICLES),
    field("particles10um", PARTICLES),
    field("particles25um", PARTICLES),
    field("particles40um", PARTICLES),
    field("particles50um", PARTICLES),
    field("particles100um", PARTICLES),
    field("particlesTps", measure("µm", 2)),
    field("co2", measure("ppm", 0)),
    field("co2Temperature", CELSIUS),
    field("co2Humidity", PERCENT),
    field("formFormaldehyde", measure("ppb", 1)),
    field("formTemperature", CELSIUS),
    field("formHumidity", PERCENT),
    field("pmTemperature", CELSIUS),
    field("pmHumidity", PERCENT),
    field("pmVocIdx", count),
    field("pmNoxIdx", count),
    field("pmStatusFlags", (value) => formatHexFlags(value)),
  ],
  soilWaterMetrics: [
    field("soilPh", measure(undefined, 1)),
    field("ph", measure(undefined, 1)),
    field("electricalConductivity", measure("mS/cm", 2)),
    field("salinity", measure("mg/L", 0)),
    field("nitrogen", measure("mg/kg", 0)),
    field("phosphorus", measure("mg/kg", 0)),
    field("potassium", measure("mg/kg", 0)),
    field("nitrate", measure("ppm", 1)),
    field("ammonium", measure("ppm", 1)),
    field("dissolvedOxygen", measure("mg/L", 1)),
    field("orp", measure("mV", 0)),
    field("chemicalOxygenDemand", measure("mg/L", 1)),
    field("biochemicalOxygenDemand", measure("mg/L", 1)),
    field("turbidity", measure("NTU", 1)),
    field("solarIrradiance", measure("W/m²", 0)),
  ],
  // ch4..ch8 are deprecated in 2.8 and no longer sent.
  powerMetrics: [1, 2, 3].flatMap((channel) => [
    {
      id: `ch${channel}Voltage`,
      label: "channelVoltage",
      labelOptions: { channel },
      format: VOLTS,
    },
    {
      id: `ch${channel}Current`,
      label: "channelCurrent",
      labelOptions: { channel },
      format: MILLIAMPS,
    },
  ]),
  healthMetrics: [
    field("heartBpm", measure("bpm", 0)),
    field("spO2", measure("%", 0)),
    field("temperature", CELSIUS),
  ],
  // LocalStats, TrafficManagementStats and the base HostMetrics fields are
  // not `optional` in the proto, so 0 can't be told apart from unset: they
  // are always shown.
  localStats: [
    field("uptimeSeconds", duration),
    field("channelUtilization", measure("%", 2)),
    field("airUtilTx", measure("%", 2)),
    field("noiseFloor", measure("dBm", 0)),
    field("numOnlineNodes", count),
    field("numTotalNodes", count),
    field("numPacketsTx", count),
    field("numPacketsRx", count),
    field("numPacketsRxBad", count),
    field("numRxDupe", count),
    field("numTxRelay", count),
    field("numTxRelayCanceled", count),
    field("numTxDropped", count),
    field("heapFreeBytes", bytes),
    field("heapTotalBytes", bytes),
  ],
  trafficManagementStats: [
    field("packetsInspected", count),
    field("positionDedupDrops", count),
    field("nodeinfoCacheHits", count),
    field("rateLimitDrops", count),
    field("unknownPacketDrops", count),
    field("hopExhaustedPackets", count),
    field("routerHopsPreserved", count),
  ],
  hostMetrics: [
    field("uptimeSeconds", duration),
    field("freememBytes", bytes),
    field("diskfree1Bytes", bytes),
    field("diskfree2Bytes", bytes),
    field("diskfree3Bytes", bytes),
  ],
};

function hostExtras(
  value: Record<string, unknown>,
  locale: string,
): TelemetryField[] {
  const extras: TelemetryField[] = [];
  const loads = [value.load1, value.load5, value.load15];
  if (loads.every((load) => typeof load === "number")) {
    extras.push({
      id: "load",
      labelKey: "hostMetrics.load",
      // Reported in hundredths.
      value: (loads as number[])
        .map((load) => formatNumber(load / 100, 2, locale))
        .join(" / "),
    });
  }
  if (typeof value.userString === "string" && value.userString !== "") {
    extras.push({
      id: "userString",
      labelKey: "hostMetrics.userString",
      value: value.userString,
    });
  }
  return extras;
}

/** Display rows for one variant; absent (unset optional) fields are skipped. */
export function describeTelemetry(
  kind: DisplayedTelemetryKind,
  value: object,
  locale = "en",
): TelemetryField[] {
  const record = value as Record<string, unknown>;
  const fields: TelemetryField[] = [];
  for (const spec of FIELD_SPECS[kind]) {
    const raw = record[spec.id];
    const num = typeof raw === "bigint" ? Number(raw) : raw;
    if (typeof num !== "number" || !Number.isFinite(num)) continue;
    fields.push({
      id: spec.id,
      labelKey: `${kind}.${spec.label ?? spec.id}`,
      ...(spec.labelOptions ? { labelOptions: spec.labelOptions } : {}),
      value: spec.format(num, locale),
    });
  }
  if (kind === "hostMetrics") fields.push(...hostExtras(record, locale));
  return fields;
}

/**
 * One section per variant the node has reported (except deviceMetrics),
 * built from its latest reading, in {@link TELEMETRY_KIND_ORDER}. Variants
 * whose latest reading has no displayable field are left out.
 */
export function telemetrySections(
  history: readonly TelemetryReading[],
  locale = "en",
): TelemetrySection[] {
  const latest = latestReadingPerKind(history);
  const sections: TelemetrySection[] = [];
  for (const kind of TELEMETRY_KIND_ORDER) {
    const reading = latest.get(kind);
    if (!reading) continue;
    const fields = describeTelemetry(kind, reading.value as object, locale);
    if (fields.length > 0) sections.push({ kind, time: reading.time, fields });
  }
  return sections;
}
