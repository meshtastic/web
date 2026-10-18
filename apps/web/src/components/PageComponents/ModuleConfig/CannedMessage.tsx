import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type CannedMessageValidation,
  CannedMessageValidationSchema,
} from "@app/validation/moduleConfig/cannedMessage.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useDevice } from "@core/stores";
import { firmwareAtLeast, Protobuf } from "@meshtastic/sdk";
import {
  useCannedMessages,
  useConfigEditor,
  useSignal,
} from "@meshtastic/sdk-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStagedAdminString } from "./useStagedAdminString.ts";

interface CannedMessageModuleConfigProps {
  onFormInit: DynamicFormFormInit<CannedMessageValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    cannedMessage?: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig;
  },
  peek: () =>
    ({}) as {
      cannedMessage?: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig;
    },
  subscribe: () => () => {},
} as const;

export const CannedMessage = ({
  onFormInit,
}: CannedMessageModuleConfigProps) => {
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

  // Both fields are deprecated from firmware 2.7.0. Like Android, offer
  // them there only while the radio still has them set.
  const { metadata } = useDeviceCapabilities();
  const deprecatedFieldsRetired = firmwareAtLeast(
    metadata?.firmwareVersion ?? "",
    "2.7.0",
  );
  const showEnabled =
    !deprecatedFieldsRetired || moduleConfig.cannedMessage?.enabled === true;
  const showAllowInputSource =
    !deprecatedFieldsRetired ||
    (moduleConfig.cannedMessage?.allowInputSource ?? "") !== "";

  // The message list isn't module config; it has its own admin get/set.
  const device = useCannedMessages();
  const messages = useStagedAdminString("cannedMessages", device.value);

  const defaultValues = useMemo(
    () =>
      ({
        ...moduleConfig.cannedMessage,
        messages: device.value ?? "",
      }) as CannedMessageValidation,
    [moduleConfig.cannedMessage, device.value],
  );
  const values = useMemo(
    () =>
      ({
        ...effective,
        messages: messages.value ?? "",
      }) as CannedMessageValidation,
    [effective, messages.value],
  );

  const onSubmit = (data: CannedMessageValidation) => {
    if (!editor) return;
    const { messages: messageList, ...config } = data;
    editor.setModuleSection(
      "cannedMessage",
      config as unknown as Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig,
    );
    messages.stage(messageList);
  };

  const messagesDescription =
    device.value !== undefined
      ? t("cannedMessage.messages.description")
      : device.isLoading
        ? t("cannedMessage.messages.loading")
        : t("cannedMessage.messages.unavailable");

  return (
    <DynamicForm<CannedMessageValidation>
      // Remount once the list arrives so it becomes the form's default
      // value instead of showing up as an unsaved edit.
      key={device.value === undefined ? "loading" : "loaded"}
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={CannedMessageValidationSchema}
      defaultValues={defaultValues}
      values={values}
      fieldGroups={[
        {
          label: t("cannedMessage.cannedMessageConfig.label"),
          description: t("cannedMessage.cannedMessageConfig.description"),
          fields: [
            ...(showEnabled
              ? [
                  {
                    type: "toggle" as const,
                    name: "enabled" as const,
                    label: t("cannedMessage.enabled.label"),
                    description: t("cannedMessage.enabled.description"),
                  },
                ]
              : []),
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
                enumValue:
                  Protobuf.ModuleConfig
                    .ModuleConfig_CannedMessageConfig_InputEventChar,
              },
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
              type: "toggle",
              name: "updown1Enabled",
              label: t("cannedMessage.updown1Enabled.label"),
              description: t("cannedMessage.updown1Enabled.description"),
            },
            ...(showAllowInputSource
              ? [
                  {
                    type: "text" as const,
                    name: "allowInputSource" as const,
                    label: t("cannedMessage.allowInputSource.label"),
                    description: t(
                      "cannedMessage.allowInputSource.description",
                    ),
                  },
                ]
              : []),
            {
              type: "toggle",
              name: "sendBell",
              label: t("cannedMessage.sendBell.label"),
              description: t("cannedMessage.sendBell.description"),
            },
            {
              type: "text",
              name: "messages",
              label: t("cannedMessage.messages.label"),
              description: messagesDescription,
              disabled: device.value === undefined,
            },
          ],
        },
      ]}
    />
  );
};
