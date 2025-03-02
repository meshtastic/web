import { useDevice } from "@core/stores/deviceStore.ts";
import type { MqttValidation } from "@app/validation/moduleConfig/mqtt.tsx";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { Protobuf } from "@meshtastic/core";

export const MQTT = () => {
  const { config, moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: MqttValidation) => {
    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "mqtt",
          value: {
            ...data,
            mapReportSettings: create(
              Protobuf.ModuleConfig.ModuleConfig_MapReportSettingsSchema,
              data.mapReportSettings,
            ),
          },
        },
      }),
    );
  };

  return (
    <DynamicForm<MqttValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.mqtt}
      fieldGroups={[
        {
          label: "MQTT Settings",
          description: "Settings for the MQTT module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Enabled",
              description: "Enable or disable MQTT",
            },
            {
              type: "text",
              name: "address",
              label: "MQTT Server Address",
              description:
                "MQTT server address to use for default/custom servers",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "text",
              name: "username",
              label: "MQTT Username",
              description: "MQTT username to use for default/custom servers",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "password",
              name: "password",
              label: "MQTT Password",
              description: "MQTT password to use for default/custom servers",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "encryptionEnabled",
              label: "Encryption Enabled",
              description:
                "Enable or disable MQTT encryption. Note: All messages are sent to the MQTT broker unencrypted if this option is not enabled, even when your uplink channels have encryption keys set. This includes position data.",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "jsonEnabled",
              label: "JSON Enabled",
              description: "Whether to send/consume JSON packets on MQTT",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "tlsEnabled",
              label: "TLS Enabled",
              description: "Enable or disable TLS",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "text",
              name: "root",
              label: "Root topic",
              description: "MQTT root topic to use for default/custom servers",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "proxyToClientEnabled",
              label: "Proxy to Client Enabled",
              description:
                "Use the client's internet connection for MQTT (feature only active in mobile apps)",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "mapReportingEnabled",
              label: "Map Reporting Enabled",
              description: "Enable or disable map reporting",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "mapReportSettings.publishIntervalSecs",
              label: "Map Report Publish Interval (s)",
              description: "Interval in seconds to publish map reports",
              properties: {
                suffix: "Seconds",
              },
              disabledBy: [
                {
                  fieldName: "enabled",
                },
                {
                  fieldName: "mapReportingEnabled",
                },
              ],
            },
            {
              type: "select",
              name: "mapReportSettings.positionPrecision",
              label: "Approximate Location",
              description:
                "Position shared will be accurate within this distance",
              properties: {
                enumValue: config.display?.units === 0
                  ? {
                    "Within 23 km": 10,
                    "Within 12 km": 11,
                    "Within 5.8 km": 12,
                    "Within 2.9 km": 13,
                    "Within 1.5 km": 14,
                    "Within 700 m": 15,
                    "Within 350 m": 16,
                    "Within 200 m": 17,
                    "Within 90 m": 18,
                    "Within 50 m": 19,
                  }
                  : {
                    "Within 15 miles": 10,
                    "Within 7.3 miles": 11,
                    "Within 3.6 miles": 12,
                    "Within 1.8 miles": 13,
                    "Within 0.9 miles": 14,
                    "Within 0.5 miles": 15,
                    "Within 0.2 miles": 16,
                    "Within 600 feet": 17,
                    "Within 300 feet": 18,
                    "Within 150 feet": 19,
                  },
              },
              disabledBy: [
                {
                  fieldName: "enabled",
                },
                {
                  fieldName: "mapReportingEnabled",
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};
