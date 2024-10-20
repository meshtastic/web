import type { CannedMessageValidation } from "@app/validation/moduleConfig/cannedMessage.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useTranslation } from "react-i18next";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";

export const CannedMessage = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: CannedMessageValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "cannedMessage",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<CannedMessageValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.cannedMessage}
      fieldGroups={[
        {
          label: t("Canned Message Settings"),
          description: t("Settings for the Canned Message module"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Module Enabled"),
              description: t("Enable Canned Message"),
            },
            {
              type: "toggle",
              name: "rotary1Enabled",
              label: t("Rotary Encoder #1 Enabled"),
              description: t("Enable the rotary encoder"),
            },
            {
              type: "number",
              name: "inputbrokerPinA",
              label: t("Encoder Pin A"),
              description: t("GPIO Pin Value (1-39) For encoder port A"),
            },
            {
              type: "number",
              name: "inputbrokerPinB",
              label: t("Encoder Pin B"),
              description: t("GPIO Pin Value (1-39) For encoder port B"),
            },
            {
              type: "number",
              name: "inputbrokerPinPress",
              label: t("Encoder Pin Press"),
              description: t("GPIO Pin Value (1-39) For encoder Press"),
            },
            {
              type: "select",
              name: "inputbrokerEventCw",
              label: t("Clockwise event"),
              description: t(t("Select input event.")),
              properties: {
                enumValue:
                  Protobuf.ModuleConfig
                    .ModuleConfig_CannedMessageConfig_InputEventChar,
              },
            },
            {
              type: "select",
              name: "inputbrokerEventCcw",
              label: t("Counter Clockwise event"),
              description: t("Select input event."),
              properties: {
                enumValue:
                  Protobuf.ModuleConfig
                    .ModuleConfig_CannedMessageConfig_InputEventChar,
              },
            },
            {
              type: "select",
              name: "inputbrokerEventPress",
              label: t("Press event"),
              description: t("Select input event."),
              properties: {
                enumValue:
                  Protobuf.ModuleConfig
                    .ModuleConfig_CannedMessageConfig_InputEventChar,
              },
            },
            {
              type: "toggle",
              name: "updown1Enabled",
              label: t("Up Down enabled"),
              description: t("Enable the up / down encoder"),
            },
            {
              type: "text",
              name: "allowInputSource",
              label: t("Allow Input Source"),
              description:
                "Select from: '_any', 'rotEnc1', 'upDownEnc1', 'cardkb'",
            },
            {
              type: "toggle",
              name: "sendBell",
              label: t("Send Bell"),
              description: t("Sends a bell character with each message"),
            },
          ],
        },
      ]}
    />
  );
};
