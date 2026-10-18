import { create, type DescMessage } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { BluetoothValidationSchema } from "./config/bluetooth.ts";
import { DeviceValidationSchema, toDeviceFormValues } from "./config/device.ts";
import { DisplayValidationSchema } from "./config/display.ts";
import { LoRaValidationSchema } from "./config/lora.ts";
import { NetworkValidationSchema } from "./config/network.ts";
import { PositionValidationSchema } from "./config/position.ts";
import { PowerValidationSchema, toPowerFormValues } from "./config/power.ts";
import { AmbientLightingValidationSchema } from "./moduleConfig/ambientLighting.ts";
import { AudioValidationSchema } from "./moduleConfig/audio.ts";
import { CannedMessageValidationSchema } from "./moduleConfig/cannedMessage.ts";
import { DetectionSensorValidationSchema } from "./moduleConfig/detectionSensor.ts";
import { ExternalNotificationValidationSchema } from "./moduleConfig/externalNotification.ts";
import { MqttValidationSchema } from "./moduleConfig/mqtt.ts";
import { NeighborInfoValidationSchema } from "./moduleConfig/neighborInfo.ts";
import { PaxcounterValidationSchema } from "./moduleConfig/paxcounter.ts";
import { RangeTestValidationSchema } from "./moduleConfig/rangeTest.ts";
import { RemoteHardwareValidationSchema } from "./moduleConfig/remoteHardware.ts";
import { SerialValidationSchema } from "./moduleConfig/serial.ts";
import { StoreForwardValidationSchema } from "./moduleConfig/storeForward.ts";
import { TakValidationSchema } from "./moduleConfig/tak.ts";
import { TelemetryValidationSchema } from "./moduleConfig/telemetry.ts";

type Schema = {
  safeParse(value: unknown): {
    success: boolean;
    error?: { issues: { path: PropertyKey[]; message: string }[] };
  };
};

const C = Protobuf.Config;
const M = Protobuf.ModuleConfig;
const fresh = (desc: DescMessage) => create(desc);

/**
 * A form auto-saves through its resolver, so a schema that rejects the
 * radio's own config blocks every change on that page. Each case is what
 * the page passes to its form for a factory-default radio.
 */
const cases: [string, Schema, unknown][] = [
  [
    "bluetooth",
    BluetoothValidationSchema,
    fresh(C.Config_BluetoothConfigSchema),
  ],
  [
    "device",
    DeviceValidationSchema,
    toDeviceFormValues(create(C.Config_DeviceConfigSchema)),
  ],
  ["display", DisplayValidationSchema, fresh(C.Config_DisplayConfigSchema)],
  ["lora", LoRaValidationSchema, fresh(C.Config_LoRaConfigSchema)],
  [
    "network",
    NetworkValidationSchema,
    {
      ...fresh(C.Config_NetworkConfigSchema),
      ipv4Config: {
        ip: "0.0.0.0",
        gateway: "0.0.0.0",
        subnet: "0.0.0.0",
        dns: "0.0.0.0",
      },
      udpBroadcast: false,
    },
  ],
  [
    "position",
    PositionValidationSchema,
    { ...fresh(C.Config_PositionConfigSchema), altitude: 0 },
  ],
  [
    "power",
    PowerValidationSchema,
    toPowerFormValues(create(C.Config_PowerConfigSchema)),
  ],
  [
    "ambientLighting",
    AmbientLightingValidationSchema,
    fresh(M.ModuleConfig_AmbientLightingConfigSchema),
  ],
  ["audio", AudioValidationSchema, fresh(M.ModuleConfig_AudioConfigSchema)],
  [
    "cannedMessage",
    CannedMessageValidationSchema,
    { ...fresh(M.ModuleConfig_CannedMessageConfigSchema), messages: "" },
  ],
  [
    "detectionSensor",
    DetectionSensorValidationSchema,
    fresh(M.ModuleConfig_DetectionSensorConfigSchema),
  ],
  [
    "externalNotification",
    ExternalNotificationValidationSchema,
    { ...fresh(M.ModuleConfig_ExternalNotificationConfigSchema), ringtone: "" },
  ],
  [
    "mqtt",
    MqttValidationSchema,
    {
      ...fresh(M.ModuleConfig_MQTTConfigSchema),
      mapReportSettings: {
        publishIntervalSecs: 3600,
        positionPrecision: 13,
        shouldReportLocation: false,
      },
    },
  ],
  [
    "neighborInfo",
    NeighborInfoValidationSchema,
    fresh(M.ModuleConfig_NeighborInfoConfigSchema),
  ],
  [
    "paxcounter",
    PaxcounterValidationSchema,
    fresh(M.ModuleConfig_PaxcounterConfigSchema),
  ],
  [
    "rangeTest",
    RangeTestValidationSchema,
    fresh(M.ModuleConfig_RangeTestConfigSchema),
  ],
  [
    "remoteHardware",
    RemoteHardwareValidationSchema,
    fresh(M.ModuleConfig_RemoteHardwareConfigSchema),
  ],
  ["serial", SerialValidationSchema, fresh(M.ModuleConfig_SerialConfigSchema)],
  [
    "storeForward",
    StoreForwardValidationSchema,
    fresh(M.ModuleConfig_StoreForwardConfigSchema),
  ],
  ["tak", TakValidationSchema, fresh(M.ModuleConfig_TAKConfigSchema)],
  [
    "telemetry",
    TelemetryValidationSchema,
    fresh(M.ModuleConfig_TelemetryConfigSchema),
  ],
];

describe("settings forms accept a factory-default radio", () => {
  it.each(cases)("%s", (_, schema, value) => {
    const result = schema.safeParse(value);
    const issues = result.error?.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    expect(issues ?? []).toEqual([]);
  });
});
