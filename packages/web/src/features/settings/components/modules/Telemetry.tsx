import { useModuleConfigForm } from "../../hooks/useModuleConfigForm";
import {
  type TelemetryValidation,
  TelemetryValidationSchema,
} from "../../validation/moduleConfig/telemetry";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading";
import { useTranslation } from "react-i18next";

export const Telemetry = () => {
  const { t } = useTranslation("moduleConfig");
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<TelemetryValidation>({
      moduleConfigType: "telemetry",
      schema: TelemetryValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<TelemetryValidation>[] = [
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
          description: t("telemetry.environmentMeasurementEnabled.description"),
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
          description: t("telemetry.environmentDisplayFahrenheit.description"),
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
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
