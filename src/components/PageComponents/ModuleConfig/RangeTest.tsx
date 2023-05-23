import type { RangeTestValidation } from "@app/validation/moduleConfig/rangeTest.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import type { ConfigPreset } from "@app/core/stores/appStore";

export const RangeTest = (): JSX.Element => {
  const config = useConfig();
  const enableSwitch: EnableSwitchData | undefined = config.overrideValues
    ? {
        getEnabled(name) {
          return config.overrideValues![name] ?? false;
        },
        setEnabled(name, value) {
          config.overrideValues![name] = value;
        }
      }
    : undefined;
  const isPresetConfig = !("id" in config);
  const setConfig: (data: RangeTestValidation) => void = isPresetConfig
    ? (data) => {
        config.moduleConfig.rangeTest =
          new Protobuf.ModuleConfig_RangeTestConfig(data);
        (config as ConfigPreset).saveConfigTree();
      }
    : (data) => {
        useDevice().setWorkingModuleConfig(
          new Protobuf.ModuleConfig({
            payloadVariant: {
              case: "rangeTest",
              value: data
            }
          })
        );
      };

  const onSubmit = setConfig;

  return (
    <DynamicForm<RangeTestValidation>
      onSubmit={onSubmit}
      defaultValues={config.moduleConfig.rangeTest}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Range Test Settings",
          description: "Settings for the Range Test module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable Range Test"
            },
            {
              type: "number",
              name: "sender",
              label: "Message Interval",
              description: "How long to wait between sending test packets"
            },
            {
              type: "toggle",
              name: "save",
              label: "Save CSV to storage",
              description: "ESP32 Only"
            }
          ]
        }
      ]}
    />
  );
};
