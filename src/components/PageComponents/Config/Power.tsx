import type { PowerValidation } from "@app/validation/config/power.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

export const Power = () => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: PowerValidation) => {
    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
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
          label: t("config_power_groupLabel_powerConfig"),
          description: t("config_power_groupDescription_powerConfig"),
          fields: [
            {
              type: "toggle",
              name: "isPowerSaving",
              label: t("config_power_fieldLabel_powerSavingEnabled"),
              description: t(
                "config_power_fieldDescription_powerSavingEnabled",
              ),
            },
            {
              type: "number",
              name: "onBatteryShutdownAfterSecs",
              label: t("config_power_fieldLabel_shutdownOnBatteryDelay"),
              description: t(
                "config_power_fieldDescription_shutdownOnBatteryDelay",
              ),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "number",
              name: "adcMultiplierOverride",
              label: t("config_power_fieldLabel_adcMultiplierOverride"),
              description: t(
                "config_power_fieldDescription_adcMultiplierOverride",
              ),
              properties: {
                step: 0.0001,
              },
            },
            {
              type: "number",
              name: "waitBluetoothSecs",
              label: t("config_power_fieldLabel_noConnectionBluetoothDisabled"),
              description: t(
                "config_power_fieldDescription_noConnectionBluetoothDisabled",
              ),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "number",
              name: "deviceBatteryInaAddress",
              label: t("config_power_fieldLabel_ina219Address"),
              description: t("config_power_fieldDescription_ina219Address"),
            },
          ],
        },
        {
          label: t("config_power_groupLabel_sleepSettings"),
          description: t("config_power_groupDescription_sleepSettings"),
          fields: [
            {
              type: "number",
              name: "sdsSecs",
              label: t("config_power_fieldLabel_superDeepSleepDuration"),
              description: t(
                "config_power_fieldDescription_superDeepSleepDuration",
              ),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "number",
              name: "lsSecs",
              label: t("config_power_fieldLabel_lightSleepDuration"),
              description: t(
                "config_power_fieldDescription_lightSleepDuration",
              ),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "number",
              name: "minWakeSecs",
              label: t("config_power_fieldLabel_minimumWakeTime"),
              description: t("config_power_fieldDescription_minimumWakeTime"),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
          ],
        },
      ]}
    />
  );
};
