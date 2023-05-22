import type { TelemetryValidation } from "@app/validation/moduleConfig/telemetry.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import type { ConfigPreset } from "@app/core/stores/appStore";

export const Telemetry = (): JSX.Element => {
  const config = useConfig();
  const enableSwitch: EnableSwitchData | undefined = config.overrideValues ? {
    getEnabled(name) {
      return config.overrideValues![name] ?? false;
    },
    setEnabled(name, value) {
      config.overrideValues![name] = value;
    },
  } : undefined;
  const isPresetConfig = !("id" in config);
  const setConfig: (data: TelemetryValidation) => void =
    isPresetConfig ? (data) => {
      config.moduleConfig.telemetry = new Protobuf.ModuleConfig_TelemetryConfig(data);
      (config as ConfigPreset).saveConfigTree();
    }
    : (data) => {
      useDevice().setWorkingModuleConfig(
        new Protobuf.ModuleConfig({
          payloadVariant: {
            case: "telemetry",
            value: data
          }
        })
      );
    }

  const onSubmit = setConfig;

  return (
    <DynamicForm<TelemetryValidation>
      onSubmit={onSubmit}
      defaultValues={config.moduleConfig.telemetry}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Telemetry Settings",
          description: "Settings for the Telemetry module",
          fields: [
            {
              type: "number",
              name: "deviceUpdateInterval",
              label: "Query Interval",
              description: "Interval to get telemetry data",
              properties: {
                suffix: "seconds"
              }
            },
            {
              type: "number",
              name: "environmentUpdateInterval",
              label: "Update Interval",
              description: "How often to send Metrics over the mesh",
              properties: {
                suffix: "seconds"
              }
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
