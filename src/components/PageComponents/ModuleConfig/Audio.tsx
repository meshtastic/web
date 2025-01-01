import type { AudioValidation } from "@app/validation/moduleConfig/audio.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useTranslation } from "react-i18next";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";

export const Audio = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: AudioValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "audio",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<AudioValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.audio}
      fieldGroups={[
        {
          label: t("Audio Settings"),
          description: t("Settings for the Audio module"),
          fields: [
            {
              type: "toggle",
              name: "codec2Enabled",
              label: t("Codec 2 Enabled"),
              description: t("Enable Codec 2 audio encoding"),
            },
            {
              type: "number",
              name: "pttPin",
              label: t("PTT Pin"),
              description: t("GPIO pin to use for PTT"),
            },
            {
              type: "select",
              name: "bitrate",
              label: t("Bitrate"),
              description: t("Bitrate to use for audio encoding"),
              properties: {
                enumValue:
                  Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud,
              },
            },
            {
              type: "number",
              name: "i2sWs",
              label: t("i2S WS"),
              description: t("GPIO pin to use for i2S WS"),
            },
            {
              type: "number",
              name: "i2sSd",
              label: t("i2S SD"),
              description: t("GPIO pin to use for i2S SD"),
            },
            {
              type: "number",
              name: "i2sDin",
              label: t("i2S DIN"),
              description: t("GPIO pin to use for i2S DIN"),
            },
            {
              type: "number",
              name: "i2sSck",
              label: t("i2S SCK"),
              description: t("GPIO pin to use for i2S SCK"),
            },
          ],
        },
      ]}
    />
  );
};
