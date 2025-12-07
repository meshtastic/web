import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type TelemetryValidation,
  TelemetryValidationSchema,
} from "@app/validation/moduleConfig/telemetry.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  createFieldMetadata,
  useFieldRegistry,
} from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface TelemetryModuleConfigProps {
  onFormInit: DynamicFormFormInit<TelemetryValidation>;
}

export const Telemetry = ({ onFormInit }: TelemetryModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "telemetry" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");
  const section = { type: "moduleConfig", variant: "telemetry" } as const;

  const onSubmit = (data: TelemetryValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.telemetry;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof TelemetryValidation>).forEach(
      (fieldName) => {
        const newValue = data[fieldName];
        const oldValue = originalData[fieldName];

        if (newValue !== oldValue) {
          trackChange(section, fieldName as string, newValue, oldValue);
        } else {
          removeFieldChange(section, fieldName as string);
        }
      },
    );
  };

  const fieldGroups = useMemo(
    () => [
      {
        label: t("telemetry.title"),
        description: t("telemetry.description"),
        fields: [
          {
            type: "number",
            name: "deviceUpdateInterval",
            label: t("telemetry.deviceUpdateInterval.label"),
            description: t("telemetry.deviceUpdateInterval.description"),
            properties: {
              suffix: t("unit.second.plural"),
            },
          },
          {
            type: "number",
            name: "environmentUpdateInterval",
            label: t("telemetry.environmentUpdateInterval.label"),
            description: t("telemetry.environmentUpdateInterval.description"),
            properties: {
              suffix: t("unit.second.plural"),
            },
          },
          {
            type: "toggle",
            name: "environmentMeasurementEnabled",
            label: t("telemetry.environmentMeasurementEnabled.label"),
            description: t(
              "telemetry.environmentMeasurementEnabled.description",
            ),
          },
          {
            type: "toggle",
            name: "environmentScreenEnabled",
            label: t("telemetry.environmentScreenEnabled.label"),
            description: t("telemetry.environmentScreenEnabled.description"),
          },
          {
            type: "toggle",
            name: "environmentDisplayFahrenheit",
            label: t("telemetry.environmentDisplayFahrenheit.label"),
            description: t(
              "telemetry.environmentDisplayFahrenheit.description",
            ),
          },
          {
            type: "toggle",
            name: "airQualityEnabled",
            label: t("telemetry.airQualityEnabled.label"),
            description: t("telemetry.airQualityEnabled.description"),
          },
          {
            type: "number",
            name: "airQualityInterval",
            label: t("telemetry.airQualityInterval.label"),
            description: t("telemetry.airQualityInterval.description"),
          },
          {
            type: "toggle",
            name: "powerMeasurementEnabled",
            label: t("telemetry.powerMeasurementEnabled.label"),
            description: t("telemetry.powerMeasurementEnabled.description"),
          },
          {
            type: "number",
            name: "powerUpdateInterval",
            label: t("telemetry.powerUpdateInterval.label"),
            description: t("telemetry.powerUpdateInterval.description"),
          },
          {
            type: "toggle",
            name: "powerScreenEnabled",
            label: t("telemetry.powerScreenEnabled.label"),
            description: t("telemetry.powerScreenEnabled.description"),
          },
        ],
      },
    ],
    [t],
  );

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  return (
    <DynamicForm<TelemetryValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={TelemetryValidationSchema}
      defaultValues={moduleConfig.telemetry}
      values={getEffectiveModuleConfig("telemetry")}
      fieldGroups={fieldGroups}
    />
  );
};
