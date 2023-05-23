import type { AudioValidation } from "@app/validation/moduleConfig/audio.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import type { ConfigPreset } from "@app/core/stores/appStore";

export const Audio = (): JSX.Element => {
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
  const setConfig: (data: AudioValidation) => void = isPresetConfig
    ? (data) => {
        config.moduleConfig.audio = new Protobuf.ModuleConfig_AudioConfig(data);
        (config as ConfigPreset).saveConfigTree();
      }
    : (data) => {
        useDevice().setWorkingModuleConfig(
          new Protobuf.ModuleConfig({
            payloadVariant: {
              case: "audio",
              value: data
            }
          })
        );
      };

  const onSubmit = setConfig;

  return (
    <DynamicForm<AudioValidation>
      onSubmit={onSubmit}
      defaultValues={config.moduleConfig.audio}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Audio Settings",
          description: "Settings for the Audio module",
          fields: [
            {
              type: "toggle",
              name: "codec2Enabled",
              label: "Codec 2 Enabled",
              description: "Enable Codec 2 audio encoding"
            },
            {
              type: "number",
              name: "pttPin",
              label: "PTT Pin",
              description: "GPIO pin to use for PTT"
            },
            {
              type: "select",
              name: "bitrate",
              label: "Bitrate",
              description: "Bitrate to use for audio encoding",
              properties: {
                enumValue: Protobuf.ModuleConfig_AudioConfig_Audio_Baud
              }
            },
            {
              type: "number",
              name: "i2sWs",
              label: "i2S WS",
              description: "GPIO pin to use for i2S WS"
            },
            {
              type: "number",
              name: "i2sSd",
              label: "i2S SD",
              description: "GPIO pin to use for i2S SD"
            },
            {
              type: "number",
              name: "i2sDin",
              label: "i2S DIN",
              description: "GPIO pin to use for i2S DIN"
            },
            {
              type: "number",
              name: "i2sSck",
              label: "i2S SCK",
              description: "GPIO pin to use for i2S SCK"
            }
          ]
        }
      ]}
    />
  );
};
