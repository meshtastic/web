import type { TelemetryValidation } from "@app/validation/moduleConfig/telemetry.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";

export const Telemetry = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: TelemetryValidation) => {
    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "telemetry",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<TelemetryValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.telemetry}
      fieldGroups={[
        {
          label: "Telemetry Settings",
          description: "Settings for the Telemetry module",
          fields: [
            {
              type: "number",
              name: "deviceUpdateInterval",
              label: "Device Metrics",
              description: "Device metrics update interval (seconds)",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "environmentUpdateInterval",
              label: "Environment metrics update interval (seconds)",
              description: "",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "toggle",
              name: "environmentMeasurementEnabled",
              label: "Module Enabled",
              description: "Enable the Environment Telemetry",
            },
            {
              type: "toggle",
              name: "environmentScreenEnabled",
              label: "Displayed on Screen",
              description: "Show the Telemetry Module on the OLED",
            },
            {
              type: "toggle",
              name: "environmentDisplayFahrenheit",
              label: "Display Fahrenheit",
              description: "Display temp in Fahrenheit",
            },
            {
              type: "toggle",
              name: "airQualityEnabled",
              label: "Air Quality Enabled",
              description: "Enable the Air Quality Telemetry",
            },
            {
              type: "number",
              name: "airQualityInterval",
              label: "Air Quality Update Interval",
              description: "How often to send Air Quality data over the mesh",
            },
            {
              type: "toggle",
              name: "powerMeasurementEnabled",
              label: "Power Measurement Enabled",
              description: "Enable the Power Measurement Telemetry",
            },
            {
              type: "number",
              name: "powerUpdateInterval",
              label: "Power Update Interval",
              description: "How often to send Power data over the mesh",
            },
            {
              type: "toggle",
              name: "powerScreenEnabled",
              label: "Power Screen Enabled",
              description: "Enable the Power Telemetry Screen",
            },
          ],
        },
      ]}
    />
  );
};
