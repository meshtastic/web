import type { SerialValidation } from "@app/validation/moduleConfig/serial.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";
import { useTranslation } from "react-i18next";

export const Serial = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: SerialValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "serial",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<SerialValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.serial}
      fieldGroups={[
        {
          label: t("Serial Settings"),
          description: t("Settings for the Serial module"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Module Enabled"),
              description: t("Enable Serial output"),
            },
            {
              type: "toggle",
              name: "echo",
              label: t("Echo"),
              description: t(
                "Any packets you send will be echoed back to your device"
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "rxd",
              label: t("Receive Pin"),
              description: t(
                "Set the GPIO pin to the RXD pin you have set up."
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "txd",
              label: t("Transmit Pin"),
              description: t(
                "Set the GPIO pin to the TXD pin you have set up."
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "select",
              name: "baud",
              label: t("Baud Rate"),
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
              label: t("Timeout"),

              description: t(
                "Seconds to wait before we consider your packet as 'done'"
              ),
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
              label: t("Mode"),
              description: t("Select Mode"),

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
              label: t("Override Console Serial Port"),
              description: t(
                "If you have a serial port connected to the console, this will override it."
              ),
            },
          ],
        },
      ]}
    />
  );
};
