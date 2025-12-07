import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type SerialValidation,
  SerialValidationSchema,
} from "@app/validation/moduleConfig/serial.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  createFieldMetadata,
  useFieldRegistry,
} from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface SerialModuleConfigProps {
  onFormInit: DynamicFormFormInit<SerialValidation>;
}

export const Serial = ({ onFormInit }: SerialModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "serial" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");

  const section = { type: "moduleConfig", variant: "serial" } as const;

  const onSubmit = (data: SerialValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.serial;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof SerialValidation>).forEach(
      (fieldName) => {
        const newValue = data[fieldName];
        const oldValue = originalData[fieldName];

        if (newValue !== oldValue) {
          trackChange(section, fieldName as string, newValue, oldValue);
        } else {
          removeFieldChange(section, fieldName as string);
        }
      },
    );
  };

  const fieldGroups = useMemo(
    () => [
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
    ],
    [t],
  );

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  return (
    <DynamicForm<SerialValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={SerialValidationSchema}
      defaultValues={moduleConfig.serial}
      values={getEffectiveModuleConfig("serial")}
      fieldGroups={fieldGroups}
    />
  );
};
