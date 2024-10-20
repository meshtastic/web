import { useDevice } from "@app/core/stores/deviceStore.ts";
import type { MqttValidation } from "@app/validation/moduleConfig/mqtt.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const MQTT = (): JSX.Element => {
  const { config, moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: MqttValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "mqtt",
          value: {
            ...data,
            mapReportSettings:
              new Protobuf.ModuleConfig.ModuleConfig_MapReportSettings(
                data.mapReportSettings
              ),
          },
        },
      })
    );
  };

  return (
    <DynamicForm<MqttValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.mqtt}
      fieldGroups={[
        {
          label: t("MQTT Settings"),
          description: t("Settings for the MQTT module"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Enabled"),
              description: t("Enable or disable MQTT"),
            },
            {
              type: "text",
              name: "address",
              label: t("MQTT Server Address"),
              description: t(
                "MQTT server address to use for default/custom servers"
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "text",
              name: "username",
              label: t("MQTT Username"),
              description: t("MQTT username to use for default/custom servers"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "password",
              name: "password",
              label: t("MQTT Password"),
              description: t("MQTT password to use for default/custom servers"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "encryptionEnabled",
              label: t("Encryption Enabled"),
              description: t(
                "Enable or disable MQTT encryption. Note: All messages are sent to the MQTT broker unencrypted if this option is not enabled, even when your uplink channels have encryption keys set. This includes position data."
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "jsonEnabled",
              label: t("JSON Enabled"),
              description: t("Whether to send/consume JSON packets on MQTT"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "tlsEnabled",
              label: t("TLS Enabled"),
              description: t("Enable or disable TLS"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "text",
              name: "root",
              label: t("Root topic"),
              description: t(
                "MQTT root topic to use for default/custom servers"
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "proxyToClientEnabled",
              label: t("Proxy to Client Enabled"),
              description: t(
                "Use the client's internet connection for MQTT (feature only active in mobile apps)"
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "mapReportingEnabled",
              label: t("Map Reporting Enabled"),
              description: t("Enable or disable map reporting"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "mapReportSettings.publishIntervalSecs",
              label: t("Map Report Publish Interval (s)"),
              description: t("Interval in seconds to publish map reports"),
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
                enumValue:
                  config.display?.units === 0
                    ? {
                        [t("Within km", { value: 23 })]: 10,
                        [t("Within km", { value: 12 })]: 11,
                        [t("Within km", { value: "5.8" })]: 12,
                        [t("Within km", { value: "2.9" })]: 13,
                        [t("Within km", { value: "1.5" })]: 14,
                        [t("Within m", { value: "700" })]: 15,
                        [t("Within m", { value: "350" })]: 16,
                        [t("Within m", { value: "200" })]: 17,
                        [t("Within m", { value: "90" })]: 18,
                        [t("Within m", { value: "50" })]: 19,
                      }
                    : {
                        [t("Within miles", { value: 15 })]: 10,
                        [t("Within miles", { value: 7.3 })]: 11,
                        [t("Within miles", { value: 3.6 })]: 12,
                        [t("Within miles", { value: 1.8 })]: 13,
                        [t("Within miles", { value: 0.9 })]: 14,
                        [t("Within miles", { value: 0.5 })]: 15,
                        [t("Within miles", { value: 0.2 })]: 16,
                        [t("Within feet", { value: 600 })]: 17,
                        [t("Within feet", { value: 300 })]: 18,
                        [t("Within feet", { value: 150 })]: 19,
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
