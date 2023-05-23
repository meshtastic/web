import type { CannedMessageValidation } from "@app/validation/moduleConfig/cannedMessage.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import type { ConfigPreset } from "@app/core/stores/appStore";

export const CannedMessage = (): JSX.Element => {
  const config = useConfig();
  const enableSwitch: EnableSwitchData | undefined = config.overrideValues
    ? {
        getEnabled(name) {
          return config.overrideValues![name] ?? false;
        },
        setEnabled(name, value) {
          config.overrideValues![name] = value;
        }
      }
    : undefined;
  const isPresetConfig = !("id" in config);
  const setConfig: (data: CannedMessageValidation) => void = isPresetConfig
    ? (data) => {
        config.moduleConfig.cannedMessage =
          new Protobuf.ModuleConfig_CannedMessageConfig(data);
        (config as ConfigPreset).saveConfigTree();
      }
    : (data) => {
        useDevice().setWorkingModuleConfig(
          new Protobuf.ModuleConfig({
            payloadVariant: {
              case: "cannedMessage",
              value: data
            }
          })
        );
      };

  const onSubmit = setConfig;

  return (
    <DynamicForm<CannedMessageValidation>
      onSubmit={onSubmit}
      defaultValues={config.moduleConfig.mqtt}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Canned Message Settings",
          description: "Settings for the Canned Message module",
          fields: [
            {
              type: "toggle",
              name: "rotary1Enabled",
              label: "Rotary Encoder #1 Enabled",
              description: "Enable the rotary encoder"
            },
            {
              type: "number",
              name: "inputbrokerPinA",
              label: "Encoder Pin A",
              description: "GPIO Pin Value (1-39) For encoder port A"
            },
            {
              type: "number",
              name: "inputbrokerPinB",
              label: "Encoder Pin B",
              description: "GPIO Pin Value (1-39) For encoder port B"
            },
            {
              type: "number",
              name: "inputbrokerPinPress",
              label: "Encoder Pin Press",
              description: "GPIO Pin Value (1-39) For encoder Press"
            },
            {
              type: "select",
              name: "inputbrokerEventCw",
              label: "Clockwise event",
              description: "Select input event.",
              properties: {
                enumValue:
                  Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
              }
            },
            {
              type: "select",
              name: "inputbrokerEventCcw",
              label: "Counter Clockwise event",
              description: "Select input event.",
              properties: {
                enumValue:
                  Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
              }
            },
            {
              type: "select",
              name: "inputbrokerEventPress",
              label: "Press event",
              description: "Select input event",
              properties: {
                enumValue:
                  Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar
              }
            },
            {
              type: "toggle",
              name: "updown1Enabled",
              label: "Up Down enabled",
              description: "Enable the up / down encoder"
            },
            {
              type: "text",
              name: "allowInputSource",
              label: "Allow Input Source",
              description:
                "Select from: '_any', 'rotEnc1', 'upDownEnc1', 'cardkb'"
            },
            {
              type: "toggle",
              name: "sendBell",
              label: "Send Bell",
              description: "Sends a bell character with each message"
            }
          ]
        }
      ]}
    />
  );
};
