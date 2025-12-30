import { useModuleConfigForm } from "../../hooks/useModuleConfigForm";
import {
  type SerialValidation,
  SerialValidationSchema,
} from "../../validation/moduleConfig/serial";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields";
import { Protobuf } from "@meshtastic/core";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading";
import { useRemoteAdminAuth } from "@shared/hooks";
import { useTranslation } from "react-i18next";

export const Serial = () => {
  const { t } = useTranslation("moduleConfig");
  const { isAuthorized } = useRemoteAdminAuth();
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<SerialValidation>({
      moduleConfigType: "serial",
      schema: SerialValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<SerialValidation>[] = [
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
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "rxd",
          label: t("serial.rxd.label"),
          description: t("serial.rxd.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "txd",
          label: t("serial.txd.label"),
          description: t("serial.txd.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "select",
          name: "baud",
          label: t("serial.baud.label"),
          description: t("serial.baud.description"),
          disabledBy: [{ fieldName: "enabled" }],
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
          disabledBy: [{ fieldName: "enabled" }],
          properties: {
            suffix: t("unit.second.plural"),
          },
        },
        {
          type: "select",
          name: "mode",
          label: t("serial.mode.label"),
          description: t("serial.mode.description"),
          disabledBy: [{ fieldName: "enabled" }],
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
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
      disabled={!isAuthorized}
    />
  );
};
