import type { ConfigPreset } from "@app/core/stores/appStore";
import type { PowerValidation } from "@app/validation/config/power.js";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Power = (): JSX.Element => {
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
  const setConfig: (data: PowerValidation) => void = isPresetConfig
    ? (data) => {
        config.config.power = new Protobuf.Config_PowerConfig(data);
        (config as ConfigPreset).saveConfigTree();
      }
    : (data) => {
        setWorkingConfig!(
          new Protobuf.Config({
            payloadVariant: {
              case: "power",
              value: data
            }
          })
        );
      };

  const onSubmit = setConfig;

  return (
    <DynamicForm<PowerValidation>
      onSubmit={onSubmit}
      defaultValues={config.config.power}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Power Config",
          description: "Settings for the power module",
          fields: [
            {
              type: "toggle",
              name: "isPowerSaving",
              label: "Enable power saving mode",
              description:
                "Select if powered from a low-current source (i.e. solar), to minimize power consumption as much as possible."
            },
            {
              type: "number",
              name: "onBatteryShutdownAfterSecs",
              label: "Shutdown on battery delay",
              description:
                "Automatically shutdown node after this long when on battery, 0 for indefinite",
              properties: {
                suffix: "Seconds"
              }
            },
            {
              type: "number",
              name: "adcMultiplierOverride",
              label: "ADC Multiplier Override ratio",
              description: "Used for tweaking battery voltage reading"
            },
            {
              type: "number",
              name: "waitBluetoothSecs",
              label: "No Connection Bluetooth Disabled",
              description:
                "If the device does not receive a Bluetooth connection, the BLE radio will be disabled after this long",
              properties: {
                suffix: "Seconds"
              }
            }
          ]
        },
        {
          label: "Sleep Settings",
          description: "Sleep settings for the power module",
          fields: [
            {
              type: "number",
              name: "meshSdsTimeoutSecs",
              label: "Mesh SDS Timeout",
              description:
                "The device will enter super deep sleep after this time",
              properties: {
                suffix: "Seconds"
              }
            },
            {
              type: "number",
              name: "sdsSecs",
              label: "Super Deep Sleep Duration",
              description:
                "How long the device will be in super deep sleep for",
              properties: {
                suffix: "Seconds"
              }
            },
            {
              type: "number",
              name: "lsSecs",
              label: "Light Sleep Duration",
              description: "How long the device will be in light sleep for",
              properties: {
                suffix: "Seconds"
              }
            },
            {
              type: "number",
              name: "minWakeSecs",
              label: "Minimum Wake Time",
              description:
                "Minimum amount of time the device will stay awake for after receiving a packet",
              properties: {
                suffix: "Seconds"
              }
            }
          ]
        }
      ]}
    />
  );
};
