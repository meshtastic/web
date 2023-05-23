import type { ConfigPreset } from "@app/core/stores/appStore";
import type { BluetoothValidation } from "@app/validation/config/bluetooth.js";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Bluetooth = (): JSX.Element => {
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
  const { setWorkingConfig } = !isPresetConfig
    ? useDevice()
    : { setWorkingConfig: undefined };
  const setConfig: (data: BluetoothValidation) => void = isPresetConfig
    ? (data) => {
        config.config.bluetooth = new Protobuf.Config_BluetoothConfig(data);
        (config as ConfigPreset).saveConfigTree();
      }
    : (data) => {
        setWorkingConfig!(
          new Protobuf.Config({
            payloadVariant: {
              case: "bluetooth",
              value: data
            }
          })
        );
      };

  const onSubmit = setConfig;

  return (
    <DynamicForm<BluetoothValidation>
      onSubmit={onSubmit}
      defaultValues={config.config.bluetooth}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Bluetooth Settings",
          description: "Settings for the Bluetooth module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Enabled",
              description: "Enable or disable Bluetooth"
            },
            {
              type: "select",
              name: "mode",
              label: "Pairing mode",
              description: "Pin selection behaviour.",
              properties: {
                enumValue: Protobuf.Config_BluetoothConfig_PairingMode,
                formatEnumName: true
              }
            },
            {
              type: "number",
              name: "fixedPin",
              label: "Pin",
              description: "Pin to use when pairing",
              properties: {}
            }
          ]
        }
      ]}
    />
  );
};
