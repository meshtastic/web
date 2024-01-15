import type { PowerValidation } from "@app/validation/config/power.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const Power = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: PowerValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "power",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<PowerValidation>
      onSubmit={onSubmit}
      defaultValues={config.power}
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
                "Select if powered from a low-current source (i.e. solar), to minimize power consumption as much as possible.",
            },
            {
              type: "number",
              name: "onBatteryShutdownAfterSecs",
              label: "Shutdown on battery delay",
              description:
                "Automatically shutdown node after this long when on battery, 0 for indefinite",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "adcMultiplierOverride",
              label: "ADC Multiplier Override ratio",
              description: "Used for tweaking battery voltage reading",
              properties: {
                step: 0.01,
              },
            },
            {
              type: "number",
              name: "waitBluetoothSecs",
              label: "No Connection Bluetooth Disabled",
              description:
                "If the device does not receive a Bluetooth connection, the BLE radio will be disabled after this long",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "deviceBatteryInaAddress",
              label: "INA219 Address",
              description: "Address of the INA219 battery monitor",
            },
          ],
        },
        {
          label: "Sleep Settings",
          description: "Sleep settings for the power module",
          fields: [
            {
              type: "number",
              name: "sdsSecs",
              label: "Super Deep Sleep Duration",
              description:
                "How long the device will be in super deep sleep for",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "lsSecs",
              label: "Light Sleep Duration",
              description: "How long the device will be in light sleep for",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "minWakeSecs",
              label: "Minimum Wake Time",
              description:
                "Minimum amount of time the device will stay awake for after receiving a packet",
              properties: {
                suffix: "Seconds",
              },
            },
          ],
        },
      ]}
    />
  );
};
