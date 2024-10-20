import type { PowerValidation } from "@app/validation/config/power.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";
import { useTranslation } from "react-i18next";

export const Power = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: PowerValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "power",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<PowerValidation>
      onSubmit={onSubmit}
      defaultValues={config.power}
      fieldGroups={[
        {
          label: t("Power Config"),
          description: t("Settings for the power module"),
          fields: [
            {
              type: "toggle",
              name: "isPowerSaving",
              label: t("Enable power saving mode"),
              description: t(
                "Select if powered from a low-current source (i.e. solar), to minimize power consumption as much as possible."
              ),
            },
            {
              type: "number",
              name: "onBatteryShutdownAfterSecs",
              label: t("Shutdown on battery delay"),
              description: t(
                "Automatically shutdown node after this long when on battery, 0 for indefinite"
              ),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "adcMultiplierOverride",
              label: t("ADC Multiplier Override ratio"),
              description: t("Used for tweaking battery voltage reading"),
              properties: {
                step: 0.0001,
              },
            },
            {
              type: "number",
              name: "waitBluetoothSecs",
              label: t("No Connection Bluetooth Disabled"),
              description: t(
                "If the device does not receive a Bluetooth connection, the BLE radio will be disabled after this long"
              ),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "deviceBatteryInaAddress",
              label: t("INA219 Address"),
              description: t("Address of the INA219 battery monitor"),
            },
          ],
        },
        {
          label: t("Sleep Settings"),
          description: t("Sleep settings for the power module"),
          fields: [
            {
              type: "number",
              name: "sdsSecs",
              label: t("Super Deep Sleep Duration"),
              description: t(
                "How long the device will be in super deep sleep for"
              ),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "lsSecs",
              label: t("Light Sleep Duration"),
              description: t("How long the device will be in light sleep for"),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "minWakeSecs",
              label: t("Minimum Wake Time"),
              description: t(
                "Minimum amount of time the device will stay awake for after receiving a packet"
              ),
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
