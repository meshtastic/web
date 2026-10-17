import { create } from "@bufbuild/protobuf";
import { Protobuf, type TelemetryReading } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  describeTelemetry,
  formatBytes,
  formatDuration,
  formatHexFlags,
  formatMeasurement,
  formatNumber,
  latestReadingPerKind,
  telemetrySections,
} from "./telemetry.ts";

const T = Protobuf.Telemetry;

const reading = (
  kind: TelemetryReading["kind"],
  value: TelemetryReading["value"],
  time: number,
): TelemetryReading => ({ nodeNum: 1, kind, value, time: new Date(time) });

const values = (fields: { id: string; value: string }[]) =>
  Object.fromEntries(fields.map((f) => [f.id, f.value]));

describe("formatNumber / formatMeasurement", () => {
  it("uses fixed fraction digits", () => {
    expect(formatNumber(21.456, 1)).toBe("21.5");
    expect(formatNumber(3, 2)).toBe("3.00");
    expect(formatNumber(12345, 0)).toBe("12,345");
  });

  it("follows the locale", () => {
    expect(formatNumber(1013.25, 1, "de-DE")).toBe("1.013,3");
  });

  it("puts a space before units except % and °", () => {
    expect(formatMeasurement(21.46, "°C", 1)).toBe("21.5 °C");
    expect(formatMeasurement(45, "%", 0)).toBe("45%");
    expect(formatMeasurement(270, "°", 0)).toBe("270°");
    expect(formatMeasurement(6.81, undefined, 1)).toBe("6.8");
  });
});

describe("formatBytes", () => {
  it("scales by 1024", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KiB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GiB");
  });

  it("accepts bigint", () => {
    expect(formatBytes(5n * 1024n * 1024n)).toBe("5.0 MiB");
  });
});

describe("formatDuration", () => {
  it("drops leading zero units", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(65)).toBe("1m 5s");
    expect(formatDuration(3600)).toBe("1h 0m 0s");
    expect(formatDuration(90061)).toBe("1d 1h 1m 1s");
  });
});

describe("formatHexFlags", () => {
  it("formats as padded hex", () => {
    expect(formatHexFlags(0)).toBe("0x0000");
    expect(formatHexFlags(1 << 4)).toBe("0x0010");
    expect(formatHexFlags(1 << 21)).toBe("0x200000");
  });
});

describe("latestReadingPerKind", () => {
  it("picks the newest reading of each kind regardless of order", () => {
    const newEnv = reading(
      "environmentMetrics",
      create(T.EnvironmentMetricsSchema, { temperature: 20 }),
      3000,
    );
    const oldEnv = reading(
      "environmentMetrics",
      create(T.EnvironmentMetricsSchema, { temperature: 10 }),
      1000,
    );
    const power = reading(
      "powerMetrics",
      create(T.PowerMetricsSchema, { ch1Voltage: 5 }),
      2000,
    );
    const latest = latestReadingPerKind([newEnv, power, oldEnv]);
    expect(latest.get("environmentMetrics")).toBe(newEnv);
    expect(latest.get("powerMetrics")).toBe(power);
    expect(latest.size).toBe(2);
  });

  it("ignores readings without a kind or a decoded value", () => {
    const latest = latestReadingPerKind([
      reading(undefined, undefined, 1000),
      reading(
        "hostMetrics",
        undefined as unknown as TelemetryReading["value"],
        2000,
      ),
    ]);
    expect(latest.size).toBe(0);
  });
});

describe("describeTelemetry", () => {
  it("skips absent optional fields and formats units", () => {
    const fields = describeTelemetry(
      "environmentMetrics",
      create(T.EnvironmentMetricsSchema, {
        temperature: 21.46,
        relativeHumidity: 55.2,
        barometricPressure: 1013.25,
        windDirection: 270,
        lightningStrikeCount1h: 0,
        lightningDistanceKm: 12,
      }),
    );
    expect(values(fields)).toEqual({
      temperature: "21.5 °C",
      relativeHumidity: "55.2%",
      barometricPressure: "1,013.3 hPa",
      windDirection: "270°",
      lightningStrikeCount1h: "0",
      lightningDistanceKm: "12 km",
    });
    expect(fields[0]).toEqual({
      id: "temperature",
      labelKey: "environmentMetrics.temperature",
      value: "21.5 °C",
    });
  });

  it("shows only the one-wire and ADC channels that are present", () => {
    const fields = describeTelemetry(
      "environmentMetrics",
      create(T.EnvironmentMetricsSchema, {
        oneWireTemperatureCh0: 18.25,
        oneWireTemperatureCh3: -4,
        adcVoltageCh7: 1.2345,
        // Deprecated in 2.8 and not displayed.
        oneWireTemperature: [99],
      }),
    );
    expect(fields).toEqual([
      {
        id: "oneWireTemperatureCh0",
        labelKey: "environmentMetrics.oneWireTemperature",
        labelOptions: { channel: 0 },
        value: "18.3 °C",
      },
      {
        id: "oneWireTemperatureCh3",
        labelKey: "environmentMetrics.oneWireTemperature",
        labelOptions: { channel: 3 },
        value: "-4.0 °C",
      },
      {
        id: "adcVoltageCh7",
        labelKey: "environmentMetrics.adcVoltage",
        labelOptions: { channel: 7 },
        value: "1.235 V",
      },
    ]);
  });

  it("formats soil and water metrics", () => {
    const fields = describeTelemetry(
      "soilWaterMetrics",
      create(T.SoilWaterMetricsSchema, {
        soilPh: 6.82,
        electricalConductivity: 1.234,
        nitrogen: 42,
        orp: 215,
        turbidity: 3.21,
        solarIrradiance: 812.4,
      }),
    );
    expect(values(fields)).toEqual({
      soilPh: "6.8",
      electricalConductivity: "1.23 mS/cm",
      nitrogen: "42 mg/kg",
      orp: "215 mV",
      turbidity: "3.2 NTU",
      solarIrradiance: "812 W/m²",
    });
  });

  it("formats air quality including the status register", () => {
    const fields = describeTelemetry(
      "airQualityMetrics",
      create(T.AirQualityMetricsSchema, {
        pm25Standard: 12,
        particles03um: 1500,
        co2: 640,
        pmStatusFlags: 1 << 4,
      }),
    );
    expect(values(fields)).toEqual({
      pm25Standard: "12 µg/m³",
      particles03um: "1,500 /0.1 L",
      co2: "640 ppm",
      pmStatusFlags: "0x0010",
    });
  });

  it("shows power channels 1-3 only (ch4-8 are deprecated)", () => {
    const fields = describeTelemetry(
      "powerMetrics",
      create(T.PowerMetricsSchema, {
        ch1Voltage: 5.1,
        ch1Current: 250,
        ch3Voltage: 3.3,
        ch4Voltage: 12,
      }),
    );
    expect(fields.map((f) => [f.id, f.labelOptions, f.value])).toEqual([
      ["ch1Voltage", { channel: 1 }, "5.10 V"],
      ["ch1Current", { channel: 1 }, "250.0 mA"],
      ["ch3Voltage", { channel: 3 }, "3.30 V"],
    ]);
  });

  it("converts host metrics bigints and load hundredths", () => {
    const fields = describeTelemetry(
      "hostMetrics",
      create(T.HostMetricsSchema, {
        uptimeSeconds: 3661,
        freememBytes: 2n * 1024n ** 3n,
        diskfree1Bytes: 512n * 1024n ** 2n,
        load1: 52,
        load5: 40,
        load15: 135,
        userString: "pi",
      }),
    );
    expect(values(fields)).toEqual({
      uptimeSeconds: "1h 1m 1s",
      freememBytes: "2.0 GiB",
      diskfree1Bytes: "512.0 MiB",
      load: "0.52 / 0.40 / 1.35",
      userString: "pi",
    });
  });

  it("always shows non-optional counters, zeros included", () => {
    const fields = describeTelemetry(
      "trafficManagementStats",
      create(T.TrafficManagementStatsSchema, { packetsInspected: 1200 }),
    );
    expect(fields).toHaveLength(7);
    expect(values(fields).packetsInspected).toBe("1,200");
    expect(values(fields).rateLimitDrops).toBe("0");
  });

  it("formats local stats", () => {
    const fields = values(
      describeTelemetry(
        "localStats",
        create(T.LocalStatsSchema, {
          uptimeSeconds: 120,
          channelUtilization: 12.345,
          noiseFloor: -112,
          heapFreeBytes: 81920,
        }),
      ),
    );
    expect(fields.uptimeSeconds).toBe("2m 0s");
    expect(fields.channelUtilization).toBe("12.35%");
    expect(fields.noiseFloor).toBe("-112 dBm");
    expect(fields.heapFreeBytes).toBe("80.0 KiB");
  });

  it("formats health metrics", () => {
    expect(
      values(
        describeTelemetry(
          "healthMetrics",
          create(T.HealthMetricsSchema, { heartBpm: 72, spO2: 98 }),
        ),
      ),
    ).toEqual({ heartBpm: "72 bpm", spO2: "98%" });
  });
});

describe("telemetrySections", () => {
  it("orders sections, skips deviceMetrics and variants with no values", () => {
    const sections = telemetrySections([
      reading(
        "soilWaterMetrics",
        create(T.SoilWaterMetricsSchema, { ph: 7 }),
        2000,
      ),
      reading(
        "deviceMetrics",
        create(T.DeviceMetricsSchema, { batteryLevel: 80 }),
        3000,
      ),
      reading(
        "environmentMetrics",
        create(T.EnvironmentMetricsSchema, { temperature: 20 }),
        1000,
      ),
      reading("healthMetrics", create(T.HealthMetricsSchema, {}), 4000),
    ]);
    expect(sections.map((s) => s.kind)).toEqual([
      "environmentMetrics",
      "soilWaterMetrics",
    ]);
    expect(sections[1]?.time).toEqual(new Date(2000));
  });
});
