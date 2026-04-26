import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type SerialValidation,
  SerialValidationSchema,
} from "@app/validation/moduleConfig/serial.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface SerialModuleConfigProps {
  onFormInit: DynamicFormFormInit<SerialValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { serial?: Protobuf.ModuleConfig.ModuleConfig_SerialConfig },
  peek: () => ({}) as { serial?: Protobuf.ModuleConfig.ModuleConfig_SerialConfig },
  subscribe: () => () => {},
} as const;

export const Serial = ({ onFormInit }: SerialModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "serial" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.serial ??
    (getEffectiveModuleConfig("serial") as
      | Protobuf.ModuleConfig.ModuleConfig_SerialConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: SerialValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "serial",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_SerialConfig,
    );
  };

  return (
    <DynamicForm<SerialValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={SerialValidationSchema}
      defaultValues={moduleConfig.serial}
      values={effective}
      fieldGroups={[
        {
          label: t("serial.serialConfig.label"),
          description: t("serial.serialConfig.description"),
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
            },
            {
              type: "number",
              name: "rxd",
              label: t("serial.rxd.label"),
              description: t("serial.rxd.description"),
            },
            {
              type: "number",
              name: "txd",
              label: t("serial.txd.label"),
              description: t("serial.txd.description"),
            },
            {
              type: "select",
              name: "baud",
              label: t("serial.baud.label"),
              description: t("serial.baud.description"),
              properties: {
                enumValue: Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Baud,
              },
            },
            {
              type: "number",
              name: "timeout",
              label: t("serial.timeout.label"),
              description: t("serial.timeout.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "select",
              name: "mode",
              label: t("serial.mode.label"),
              description: t("serial.mode.description"),
              properties: {
                enumValue: Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Mode,
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
