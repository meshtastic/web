import { useModuleConfigForm } from "@app/pages/Settings/hooks/useModuleConfigForm";
import {
  type CannedMessageValidation,
  CannedMessageValidationSchema,
} from "@app/validation/moduleConfig/cannedMessage";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@components/Form/ConfigFormFields";
import { Protobuf } from "@meshtastic/core";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { useTranslation } from "react-i18next";

export const CannedMessage = () => {
  const { t } = useTranslation("moduleConfig");
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<CannedMessageValidation>({
      moduleConfigType: "cannedMessage",
      schema: CannedMessageValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<CannedMessageValidation>[] = [
    {
      label: t("cannedMessage.title"),
      description: t("cannedMessage.description"),
      fields: [
        {
          type: "toggle",
          name: "enabled",
          label: t("cannedMessage.moduleEnabled.label"),
          description: t("cannedMessage.moduleEnabled.description"),
        },
        {
          type: "toggle",
          name: "rotary1Enabled",
          label: t("cannedMessage.rotary1Enabled.label"),
          description: t("cannedMessage.rotary1Enabled.description"),
        },
        {
          type: "number",
          name: "inputbrokerPinA",
          label: t("cannedMessage.inputbrokerPinA.label"),
          description: t("cannedMessage.inputbrokerPinA.description"),
        },
        {
          type: "number",
          name: "inputbrokerPinB",
          label: t("cannedMessage.inputbrokerPinB.label"),
          description: t("cannedMessage.inputbrokerPinB.description"),
        },
        {
          type: "number",
          name: "inputbrokerPinPress",
          label: t("cannedMessage.inputbrokerPinPress.label"),
          description: t("cannedMessage.inputbrokerPinPress.description"),
        },
        {
          type: "select",
          name: "inputbrokerEventCw",
          label: t("cannedMessage.inputbrokerEventCw.label"),
          description: t("cannedMessage.inputbrokerEventCw.description"),
          properties: {
            enumValue:
              Protobuf.ModuleConfig
                .ModuleConfig_CannedMessageConfig_InputEventChar,
          },
        },
        {
          type: "select",
          name: "inputbrokerEventCcw",
          label: t("cannedMessage.inputbrokerEventCcw.label"),
          description: t("cannedMessage.inputbrokerEventCcw.description"),
          properties: {
            enumValue:
              Protobuf.ModuleConfig
                .ModuleConfig_CannedMessageConfig_InputEventChar,
          },
        },
        {
          type: "select",
          name: "inputbrokerEventPress",
          label: t("cannedMessage.inputbrokerEventPress.label"),
          description: t("cannedMessage.inputbrokerEventPress.description"),
          properties: {
            enumValue:
              Protobuf.ModuleConfig
                .ModuleConfig_CannedMessageConfig_InputEventChar,
          },
        },
        {
          type: "toggle",
          name: "updown1Enabled",
          label: t("cannedMessage.updown1Enabled.label"),
          description: t("cannedMessage.updown1Enabled.description"),
        },
        {
          type: "text",
          name: "allowInputSource",
          label: t("cannedMessage.allowInputSource.label"),
          description: t("cannedMessage.allowInputSource.description"),
        },
        {
          type: "toggle",
          name: "sendBell",
          label: t("cannedMessage.sendBell.label"),
          description: t("cannedMessage.sendBell.description"),
        },
      ],
    },
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
