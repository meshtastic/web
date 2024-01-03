import type { SerialValidation } from "@app/validation/moduleConfig/serial.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const Serial = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: SerialValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "serial",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<SerialValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.serial}
      fieldGroups={[
        {
          label: "Serial Settings",
          description: "Settings for the Serial module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable Serial output",
            },
            {
              type: "toggle",
              name: "echo",
              label: "Echo",
              description:
                "Any packets you send will be echoed back to your device",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "rxd",
              label: "Receive Pin",
              description: "Set the GPIO pin to the RXD pin you have set up.",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "txd",
              label: "Transmit Pin",
              description: "Set the GPIO pin to the TXD pin you have set up.",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "select",
              name: "baud",
              label: "Baud Rate",
              description: "The serial baud rate",

              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                enumValue:
                  Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Baud,
              },
            },
            {
              type: "number",
              name: "timeout",
              label: "Timeout",

              description:
                "Seconds to wait before we consider your packet as 'done'",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "select",
              name: "mode",
              label: "Mode",
              description: "Select Mode",

              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                enumValue:
                  Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Mode,
                formatEnumName: true,
              },
            },
            {
              type: "toggle",
              name: "overrideConsoleSerialPort",
              label: "Override Console Serial Port",
              description:
                "If you have a serial port connected to the console, this will override it.",
            },
          ],
        },
      ]}
    />
  );
};
