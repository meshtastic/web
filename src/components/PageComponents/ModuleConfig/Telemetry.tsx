import type { TelemetryValidation } from "@app/validation/moduleConfig/telemetry.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useTranslation } from "react-i18next";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";

export const Telemetry = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: TelemetryValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "telemetry",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<TelemetryValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.telemetry}
      fieldGroups={[
        {
          label: t("Telemetry Settings"),
          description: t("Settings for the Telemetry module"),
          fields: [
            {
              type: "number",
              name: "deviceUpdateInterval",
              label: t("Query Interval"),
              description: t("Interval to get telemetry data"),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "environmentUpdateInterval",
              label: t("Update Interval"),
              description: t("How often to send Metrics over the mesh"),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "toggle",
              name: "environmentMeasurementEnabled",
              label: t("Module Enabled"),
              description: t("Enable the Environment Telemetry"),
            },
            {
              type: "toggle",
              name: "environmentScreenEnabled",
              label: t("Displayed on Screen"),
              description: t("Show the Telemetry Module on the OLED"),
            },
            {
              type: "toggle",
              name: "environmentDisplayFahrenheit",
              label: t("Display Fahrenheit"),
              description: t("Display temp in Fahrenheit"),
            },
            {
              type: "toggle",
              name: "airQualityEnabled",
              label: t("Air Quality Enabled"),
              description: t("Enable the Air Quality Telemetry"),
            },
            {
              type: "number",
              name: "airQualityInterval",
              label: t("Air Quality Update Interval"),
              description: t(
                "How often to send Air Quality data over the mesh"
              ),
            },
            {
              type: "toggle",
              name: "powerMeasurementEnabled",
              label: t("Power Measurement Enabled"),
              description: t("Enable the Power Measurement Telemetry"),
            },
            {
              type: "number",
              name: "powerUpdateInterval",
              label: t("Power Update Interval"),
              description: t("How often to send Power data over the mesh"),
            },
            {
              type: "toggle",
              name: "powerScreenEnabled",
              label: t("Power Screen Enabled"),
              description: t("Enable the Power Telemetry Screen"),
            },
          ],
        },
      ]}
    />
  );
};
