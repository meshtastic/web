import { useDevice } from "@app/core/stores/deviceStore.js";
import type { MqttValidation } from "@app/validation/moduleConfig/mqtt.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { Protobuf } from "@meshtastic/js";

export const MQTT = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: MqttValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "mqtt",
          value: data,
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
              description: "Enable or disable MQTT encryption",
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
          ],
        },
      ]}
    />
  );
};
