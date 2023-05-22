import type { MQTTValidation } from "@app/validation/moduleConfig/mqtt.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import { useConfig, useDevice } from "@app/core/stores/deviceStore.js";
import type { ConfigPreset } from "@app/core/stores/appStore";

export const MQTT = (): JSX.Element => {
  const config = useConfig();
  const enableSwitch: EnableSwitchData | undefined = config.overrideValues ? {
    getEnabled(name) {
      return config.overrideValues![name] ?? false;
    },
    setEnabled(name, value) {
      config.overrideValues![name] = value;
    },
  } : undefined;
  const isPresetConfig = !("id" in config);
  const setConfig: (data: MQTTValidation) => void =
    isPresetConfig ? (data) => {
      config.moduleConfig.mqtt = new Protobuf.ModuleConfig_MQTTConfig(data);
      (config as ConfigPreset).saveConfigTree();
    }
    : (data) => {
      useDevice().setWorkingModuleConfig(
        new Protobuf.ModuleConfig({
          payloadVariant: {
            case: "mqtt",
            value: data
          }
        })
      );
    }

  const onSubmit = setConfig;

  return (
    <DynamicForm<MQTTValidation>
      onSubmit={onSubmit}
      defaultValues={config.moduleConfig.mqtt}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "MQTT Settings",
          description: "Settings for the MQTT module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Enabled",
              description: "Enable or disable MQTT"
            },
            {
              type: "text",
              name: "address",
              label: "MQTT Server Address",
              description:
                "MQTT server address to use for default/custom servers",
            },
            {
              type: "text",
              name: "username",
              label: "MQTT Username",
              description: "MQTT username to use for default/custom servers",
            },
            {
              type: "password",
              name: "password",
              label: "MQTT Password",
              description: "MQTT password to use for default/custom servers",
            },
            {
              type: "toggle",
              name: "encryptionEnabled",
              label: "Encryption Enabled",
              description: "Enable or disable MQTT encryption",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "jsonEnabled",
              label: "JSON Enabled",
              description: "Whether to send/consume JSON packets on MQTT",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            }
          ]
        }
      ]}
    />
  );
};
