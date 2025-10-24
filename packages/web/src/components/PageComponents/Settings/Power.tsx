import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type PowerValidation,
  PowerValidationSchema,
} from "@app/validation/config/power.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface PowerConfigProps {
  onFormInit: DynamicFormFormInit<PowerValidation>;
}
export const Power = ({ onFormInit }: PowerConfigProps) => {
  useWaitForConfig({ configCase: "power" });

  const { setChange, config, getEffectiveConfig, removeChange } = useDevice();
  const { t } = useTranslation("config");

  const onSubmit = (data: PowerValidation) => {
    if (deepCompareConfig(config.power, data, true)) {
      removeChange({ type: "config", variant: "power" });
      return;
    }

    setChange({ type: "config", variant: "power" }, data, config.power);
  };

  return (
    <DynamicForm<PowerValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={PowerValidationSchema}
      defaultValues={config.power}
      values={getEffectiveConfig("power")}
      fieldGroups={[
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
      ]}
    />
  );
};
