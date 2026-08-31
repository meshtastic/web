import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fromByteArray } from "base64-js";
import { describe, expect, it } from "vitest";
import { makeChannelSchema } from "./channel.ts";
import { BluetoothValidationSchema } from "./config/bluetooth.ts";
import { DeviceValidationSchema } from "./config/device.ts";
import { DisplayValidationSchema } from "./config/display.ts";
import { LoRaValidationSchema } from "./config/lora.ts";
import { NetworkValidationSchema } from "./config/network.ts";
import { PositionValidationSchema } from "./config/position.ts";
import { PowerValidationSchema } from "./config/power.ts";
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
import { StatusMessageValidationSchema } from "./moduleConfig/statusMessage.ts";
import { StoreForwardValidationSchema } from "./moduleConfig/storeForward.ts";
import { TakValidationSchema } from "./moduleConfig/tak.ts";
import { TelemetryValidationSchema } from "./moduleConfig/telemetry.ts";
import { TrafficManagementValidationSchema } from "./moduleConfig/trafficManagement.ts";

/**
 * Guards a whole class of silent save failures.
 *
 * Every settings form auto-saves through `handleSubmit`, so a validation
 * failure — on *any* field, including ones the form never renders — makes the
 * form stage nothing at all. No error is shown next to anything the user can
 * fix, the toggle still moves, and "Save" then commits a real begin/commit
 * transaction that simply does not contain the change.
 *
 * The precondition for a form to be savable is therefore: its schema must
 * accept the config the device itself reported. These tests parse exactly what
 * each form feeds its resolver — the protobuf message, with the component's
 * own normalisations applied where it has any.
 */

type Schema = {
  safeParse(value: unknown): { success: boolean; error?: unknown };
};

function expectAccepts(schema: Schema, value: unknown, label: string): void {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues = (
      result.error as { issues: Array<{ path: unknown[]; message: string }> }
    ).issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(
      `${label} rejects the value the device reported: ${issues.join("; ")}`,
    );
  }
  expect(result.success).toBe(true);
}

/** Sections whose form hands the protobuf message straight to the resolver. */
const directSections: Array<[string, Schema, unknown]> = [
  [
    "config/lora",
    LoRaValidationSchema,
    Protobuf.Config.Config_LoRaConfigSchema,
  ],
  [
    "config/device",
    DeviceValidationSchema,
    Protobuf.Config.Config_DeviceConfigSchema,
  ],
  [
    "config/display",
    DisplayValidationSchema,
    Protobuf.Config.Config_DisplayConfigSchema,
  ],
  [
    "config/position",
    PositionValidationSchema,
    Protobuf.Config.Config_PositionConfigSchema,
  ],
  [
    "config/power",
    PowerValidationSchema,
    Protobuf.Config.Config_PowerConfigSchema,
  ],
  [
    "module/serial",
    SerialValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_SerialConfigSchema,
  ],
  [
    "module/externalNotification",
    ExternalNotificationValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfigSchema,
  ],
  [
    "module/storeForward",
    StoreForwardValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfigSchema,
  ],
  [
    "module/rangeTest",
    RangeTestValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_RangeTestConfigSchema,
  ],
  [
    "module/telemetry",
    TelemetryValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_TelemetryConfigSchema,
  ],
  [
    "module/cannedMessage",
    CannedMessageValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfigSchema,
  ],
  [
    "module/audio",
    AudioValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_AudioConfigSchema,
  ],
  [
    "module/neighborInfo",
    NeighborInfoValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfigSchema,
  ],
  [
    "module/ambientLighting",
    AmbientLightingValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_AmbientLightingConfigSchema,
  ],
  [
    "module/detectionSensor",
    DetectionSensorValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfigSchema,
  ],
  [
    "module/paxcounter",
    PaxcounterValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_PaxcounterConfigSchema,
  ],
  [
    "module/remoteHardware",
    RemoteHardwareValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_RemoteHardwareConfigSchema,
  ],
  [
    "module/trafficManagement",
    TrafficManagementValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_TrafficManagementConfigSchema,
  ],
  [
    "module/statusMessage",
    StatusMessageValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfigSchema,
  ],
  [
    "module/tak",
    TakValidationSchema,
    Protobuf.ModuleConfig.ModuleConfig_TAKConfigSchema,
  ],
];

describe("form schemas accept what the device reports", () => {
  for (const [label, schema, messageSchema] of directSections) {
    it(`${label} accepts a factory-default message`, () => {
      expectAccepts(schema, create(messageSchema as never), label);
    });
  }

  it("config/bluetooth accepts a device that never set a fixed PIN", () => {
    expectAccepts(
      BluetoothValidationSchema,
      create(Protobuf.Config.Config_BluetoothConfigSchema, {
        enabled: true,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.RANDOM_PIN,
        fixedPin: 0,
      }),
      "config/bluetooth",
    );
  });

  it("config/network accepts the shape the Network form builds", () => {
    const cfg = create(Protobuf.Config.Config_NetworkConfigSchema, {});
    expectAccepts(
      NetworkValidationSchema,
      {
        ...cfg,
        // Network/index.tsx converts the packed IPs to dotted strings and
        // defaults the protocol flags before handing them to the resolver.
        ipv4Config: {
          ip: "0.0.0.0",
          gateway: "0.0.0.0",
          subnet: "0.0.0.0",
          dns: "0.0.0.0",
        },
        enabledProtocols:
          Protobuf.Config.Config_NetworkConfig_ProtocolFlags.NO_BROADCAST,
      },
      "config/network",
    );
  });

  it("module/mqtt accepts a device with no map-report settings", () => {
    const cfg = create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
      enabled: false,
      address: "mqtt.example.org",
    });
    expectAccepts(
      MqttValidationSchema,
      {
        ...cfg,
        // MQTT.tsx supplies the sub-message the device may omit.
        mapReportSettings: {
          publishIntervalSecs: 3600,
          positionPrecision: 32,
          shouldReportLocation: true,
        },
      },
      "module/mqtt",
    );
  });

  const channelCases: Array<[string, Protobuf.Channel.ChannelSettings]> = [
    [
      "factory primary (1-byte default PSK, no module settings)",
      create(Protobuf.Channel.ChannelSettingsSchema, {
        psk: new Uint8Array([1]),
      }),
    ],
    [
      "a device carrying the deprecated channel_num slot",
      create(Protobuf.Channel.ChannelSettingsSchema, {
        psk: new Uint8Array([1]),
        channelNum: 20,
        id: 3123456789,
      }),
    ],
    [
      "a muted channel with a 32-byte PSK",
      create(Protobuf.Channel.ChannelSettingsSchema, {
        psk: new Uint8Array(32).fill(7),
        name: "LongFast",
        moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
          positionPrecision: 13,
          isMuted: true,
        }),
      }),
    ],
  ];

  for (const [label, settings] of channelCases) {
    it(`channel accepts ${label}`, () => {
      // Channel.tsx base64-encodes the PSK, sizes the schema from its byte
      // length and defaults the position precision.
      expectAccepts(
        makeChannelSchema(settings.psk.length),
        {
          index: 0,
          role: Protobuf.Channel.Channel_Role.PRIMARY,
          settings: {
            ...settings,
            psk: fromByteArray(settings.psk),
            moduleSettings: {
              ...settings.moduleSettings,
              positionPrecision:
                settings.moduleSettings?.positionPrecision ?? 10,
            },
          },
        },
        `channel (${label})`,
      );
    });
  }
});
