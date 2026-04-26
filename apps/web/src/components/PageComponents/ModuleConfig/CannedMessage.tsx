import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type CannedMessageValidation,
  CannedMessageValidationSchema,
} from "@app/validation/moduleConfig/cannedMessage.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface CannedMessageModuleConfigProps {
  onFormInit: DynamicFormFormInit<CannedMessageValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { cannedMessage?: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig },
  peek: () => ({}) as { cannedMessage?: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig },
  subscribe: () => () => {},
} as const;

export const CannedMessage = ({ onFormInit }: CannedMessageModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "cannedMessage" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.cannedMessage ??
    (getEffectiveModuleConfig("cannedMessage") as
      | Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: CannedMessageValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "cannedMessage",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig,
    );
  };

  return (
    <DynamicForm<CannedMessageValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={CannedMessageValidationSchema}
      defaultValues={moduleConfig.cannedMessage}
      values={effective}
      fieldGroups={[
        {
          label: t("cannedMessage.cannedMessageConfig.label"),
          description: t("cannedMessage.cannedMessageConfig.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("cannedMessage.enabled.label"),
              description: t("cannedMessage.enabled.description"),
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
              name: "inputbrokerEventPress",
              label: t("cannedMessage.inputbrokerEventPress.label"),
              description: t("cannedMessage.inputbrokerEventPress.description"),
              properties: {
                enumValue: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar,
              },
            },
            {
              type: "select",
              name: "inputbrokerEventCw",
              label: t("cannedMessage.inputbrokerEventCw.label"),
              description: t("cannedMessage.inputbrokerEventCw.description"),
              properties: {
                enumValue: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar,
              },
            },
            {
              type: "select",
              name: "inputbrokerEventCcw",
              label: t("cannedMessage.inputbrokerEventCcw.label"),
              description: t("cannedMessage.inputbrokerEventCcw.description"),
              properties: {
                enumValue: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar,
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
      ]}
    />
  );
};
