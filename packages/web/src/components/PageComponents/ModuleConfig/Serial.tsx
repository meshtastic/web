import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type SerialValidation,
  SerialValidationSchema,
} from "@app/validation/moduleConfig/serial.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface SerialModuleConfigProps {
  onFormInit: DynamicFormFormInit<SerialValidation>;
}

export const Serial = ({ onFormInit }: SerialModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "serial" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: SerialValidation) => {
    if (deepCompareConfig(moduleConfig.serial, data, true)) {
      removeChange({ type: "moduleConfig", variant: "serial" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "serial" },
      data,
      moduleConfig.serial,
    );
  };

  return (
    <DynamicForm<SerialValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={SerialValidationSchema}
      defaultValues={moduleConfig.serial}
      values={getEffectiveModuleConfig("serial")}
      fieldGroups={[
        {
          label: t("serial.title"),
          description: t("serial.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("serial.enabled.label"),
              description: t("serial.enabled.description"),
            },
            {
              type: "toggle",
              name: "echo",
              label: t("serial.echo.label"),
              description: t("serial.echo.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "rxd",
              label: t("serial.rxd.label"),
              description: t("serial.rxd.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "txd",
              label: t("serial.txd.label"),
              description: t("serial.txd.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "select",
              name: "baud",
              label: t("serial.baud.label"),
              description: t("serial.baud.description"),

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
              label: t("serial.timeout.label"),
              description: t("serial.timeout.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                suffix: t("unit.second.plural"),
              },
            },
            {
              type: "select",
              name: "mode",
              label: t("serial.mode.label"),
              description: t("serial.mode.description"),

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
              label: t("serial.overrideConsoleSerialPort.label"),
              description: t("serial.overrideConsoleSerialPort.description"),
            },
          ],
        },
      ]}
    />
  );
};
