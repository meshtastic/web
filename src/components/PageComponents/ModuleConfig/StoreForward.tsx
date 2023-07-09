import type { StoreForwardValidation } from "@app/validation/moduleConfig/storeForward.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import type { ConfigPreset } from "@app/core/stores/appStore";

export const StoreForward = (): JSX.Element => {
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
  const setConfig: (data: StoreForwardValidation) => void = isPresetConfig
    ? (data) => {
        config.moduleConfig.storeForward =
          new Protobuf.ModuleConfig_StoreForwardConfig(data);
        (config as ConfigPreset).saveConfigTree();
      }
    : (data) => {
        useDevice().setWorkingModuleConfig(
          new Protobuf.ModuleConfig({
            payloadVariant: {
              case: "storeForward",
              value: data
            }
          })
        );
      };

  const onSubmit = setConfig;
  return (
    <DynamicForm<StoreForwardValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.storeForward}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Store & Forward Settings",
          description: "Settings for the Store & Forward module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable Store & Forward"
            },
            {
              type: "toggle",
              name: "heartbeat",
              label: "Heartbeat Enabled",
              description: "Enable Store & Forward heartbeat",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "number",
              name: "records",
              label: "Number of records",
              description: "Number of records to store",

              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ],
              properties: {
                suffix: "Records"
              }
            },
            {
              type: "number",
              name: "historyReturnMax",
              label: "History return max",
              description: "Max number of records to return",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "number",
              name: "historyReturnWindow",
              label: "History return window",
              description: "Max number of records to return",
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
