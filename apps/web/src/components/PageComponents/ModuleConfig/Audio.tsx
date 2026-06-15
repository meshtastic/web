import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import { type AudioValidation, AudioValidationSchema } from "@app/validation/moduleConfig/audio.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface AudioModuleConfigProps {
  onFormInit: DynamicFormFormInit<AudioValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { audio?: Protobuf.ModuleConfig.ModuleConfig_AudioConfig },
  peek: () => ({}) as { audio?: Protobuf.ModuleConfig.ModuleConfig_AudioConfig },
  subscribe: () => () => {},
} as const;

export const Audio = ({ onFormInit }: AudioModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "audio" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.audio ??
    (getEffectiveModuleConfig("audio") as
      | Protobuf.ModuleConfig.ModuleConfig_AudioConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: AudioValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "audio",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_AudioConfig,
    );
  };

  return (
    <DynamicForm<AudioValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={AudioValidationSchema}
      defaultValues={moduleConfig.audio}
      values={effective}
      fieldGroups={[
        {
          label: t("audio.audioConfig.label"),
          description: t("audio.audioConfig.description"),
          fields: [
            {
              type: "toggle",
              name: "codec2Enabled",
              label: t("audio.codec2Enabled.label"),
              description: t("audio.codec2Enabled.description"),
            },
            {
              type: "number",
              name: "pttPin",
              label: t("audio.pttPin.label"),
              description: t("audio.pttPin.description"),
            },
            {
              type: "select",
              name: "bitrate",
              label: t("audio.bitrate.label"),
              description: t("audio.bitrate.description"),
              properties: {
                enumValue: Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud,
              },
            },
            {
              type: "number",
              name: "i2sWs",
              label: t("audio.i2sWs.label"),
              description: t("audio.i2sWs.description"),
            },
            {
              type: "number",
              name: "i2sSd",
              label: t("audio.i2sSd.label"),
              description: t("audio.i2sSd.description"),
            },
            {
              type: "number",
              name: "i2sDin",
              label: t("audio.i2sDin.label"),
              description: t("audio.i2sDin.description"),
            },
            {
              type: "number",
              name: "i2sSck",
              label: t("audio.i2sSck.label"),
              description: t("audio.i2sSck.description"),
            },
          ],
        },
      ]}
    />
  );
};
