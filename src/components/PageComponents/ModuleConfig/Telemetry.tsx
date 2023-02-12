import type { TelemetryValidation } from "@app/validation/moduleConfig/telemetry.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm } from "@app/components/DynamicForm.js";

export const Telemetry = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: TelemetryValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig({
        payloadVariant: {
          case: "telemetry",
          value: data
        }
      })
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
              label: "Interval to get telemetry data",
              suffix: "seconds"
            },
            {
              type: "number",
              name: "environmentUpdateInterval",
              label: "Update Interval",
              description: "How often to send Metrics over the mesh",
              suffix: "seconds"
            },
            {
              type: "toggle",
              name: "environmentMeasurementEnabled",
              label: "Module Enabled",
              description: "Enable the Environment Telemetry"
            },
            {
              type: "toggle",
              name: "environmentScreenEnabled",
              label: "Displayed on Screen",
              description: "Show the Telemetry Module on the OLED"
            },
            {
              type: "toggle",
              name: "environmentDisplayFahrenheit",
              label: "Display Fahrenheit",
              description: "Display temp in Fahrenheit"
            }
          ]
        }
      ]}
    />
  );
};
