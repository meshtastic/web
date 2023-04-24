import type { SerialValidation } from "@app/validation/moduleConfig/serial.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import type { ConfigPreset } from "@app/core/stores/appStore";

export const Serial = (): JSX.Element => {
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
  const setConfig: (data: SerialValidation) => void =
    isPresetConfig ? (data) => {
      config.moduleConfig.serial = new Protobuf.ModuleConfig_SerialConfig(data);    
      (config as ConfigPreset).saveConfigTree();
    }
    : (data) => {
      useDevice().setWorkingModuleConfig(
        new Protobuf.ModuleConfig({
          payloadVariant: {
            case: "serial",
            value: data
          }
        })
      );
    }
  
  const onSubmit = setConfig;

  return (
    <DynamicForm<SerialValidation>
      onSubmit={onSubmit}
      defaultValues={config.moduleConfig.serial}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Serial Settings",
          description: "Settings for the Serial module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable Serial output"
            },
            {
              type: "toggle",
              name: "echo",
              label: "Echo",
              description:
                "Any packets you send will be echoed back to your device",
            },
            {
              type: "number",
              name: "rxd",
              label: "Receive Pin",
              description: "Set the GPIO pin to the RXD pin you have set up.",
            },
            {
              type: "number",
              name: "txd",
              label: "Transmit Pin",
              description: "Set the GPIO pin to the TXD pin you have set up.",
            },
            {
              type: "select",
              name: "baud",
              label: "Baud Rate",
              description: "The serial baud rate",
              properties: {
                enumValue: Protobuf.ModuleConfig_SerialConfig_Serial_Baud
              }
            },
            {
              type: "number",
              name: "timeout",
              label: "Timeout",

              description:
                "Seconds to wait before we consider your packet as 'done'",
              properties: {
                suffix: "Seconds"
              }
            },
            {
              type: "select",
              name: "mode",
              label: "Mode",
              description: "Select Mode",
              properties: {
                enumValue: Protobuf.ModuleConfig_SerialConfig_Serial_Mode,
                formatEnumName: true
              }
            }
          ]
        }
      ]}
    />
  );
};
