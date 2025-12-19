import { useConfigForm } from "../../hooks/useConfigForm";
import {
  type PowerValidation,
  PowerValidationSchema,
} from "../../validation/config/power";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading";
import { useTranslation } from "react-i18next";

export const Power = () => {
  const { t } = useTranslation("config");
  const { form, isReady, isDisabledByField } = useConfigForm<PowerValidation>({
    configType: "power",
    schema: PowerValidationSchema,
  });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<PowerValidation>[] = [
    {
      label: t("power.powerConfigSettings.label"),
      description: t("power.powerConfigSettings.description"),
      fields: [
        {
          type: "toggle",
          name: "isPowerSaving",
          label: t("power.powerSavingEnabled.label"),
          description: t("power.powerSavingEnabled.description"),
        },
        {
          type: "number",
          name: "onBatteryShutdownAfterSecs",
          label: t("power.shutdownOnBatteryDelay.label"),
          description: t("power.shutdownOnBatteryDelay.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
        },
        {
          type: "number",
          name: "adcMultiplierOverride",
          label: t("power.adcMultiplierOverride.label"),
          description: t("power.adcMultiplierOverride.description"),
          properties: {
            step: 0.0001,
          },
        },
        {
          type: "number",
          name: "waitBluetoothSecs",
          label: t("power.noConnectionBluetoothDisabled.label"),
          description: t("power.noConnectionBluetoothDisabled.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
        },
        {
          type: "number",
          name: "deviceBatteryInaAddress",
          label: t("power.ina219Address.label"),
          description: t("power.ina219Address.description"),
        },
      ],
    },
    {
      label: t("power.sleepSettings.label"),
      description: t("power.sleepSettings.description"),
      fields: [
        {
          type: "number",
          name: "sdsSecs",
          label: t("power.superDeepSleepDuration.label"),
          description: t("power.superDeepSleepDuration.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
        },
        {
          type: "number",
          name: "lsSecs",
          label: t("power.lightSleepDuration.label"),
          description: t("power.lightSleepDuration.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
        },
        {
          type: "number",
          name: "minWakeSecs",
          label: t("power.minimumWakeTime.label"),
          description: t("power.minimumWakeTime.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
        },
      ],
    },
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
