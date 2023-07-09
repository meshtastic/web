import { useDevice } from "@app/core/stores/deviceStore.js";
import type { MQTTValidation } from "@app/validation/moduleConfig/mqtt.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const MQTT = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: MQTTValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig({
        payloadVariant: {
          case: "mqtt",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<MQTTValidation>
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
                "Whether to proxy MQTT packets to the client (for example to Home Assistant)",
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
