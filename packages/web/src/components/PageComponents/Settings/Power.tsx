import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type PowerValidation,
  PowerValidationSchema,
} from "@app/validation/config/power.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  createFieldMetadata,
  useFieldRegistry,
} from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface PowerConfigProps {
  onFormInit: DynamicFormFormInit<PowerValidation>;
}
export const Power = ({ onFormInit }: PowerConfigProps) => {
  useWaitForConfig({ configCase: "power" });

  const { config, getEffectiveConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("config");

  const section = { type: "config", variant: "power" } as const;

  const fieldGroups = [
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

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  const onSubmit = (data: PowerValidation) => {
    // Track individual field changes
    const originalData = config.power;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof PowerValidation>).forEach((fieldName) => {
      const newValue = data[fieldName];
      const oldValue = originalData[fieldName];

      if (newValue !== oldValue) {
        trackChange(section, fieldName as string, newValue, oldValue);
      } else {
        removeFieldChange(section, fieldName as string);
      }
    });
  };

  return (
    <DynamicForm<PowerValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={PowerValidationSchema}
      defaultValues={config.power}
      values={getEffectiveConfig("power")}
      fieldGroups={fieldGroups}
    />
  );
};
