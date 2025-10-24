import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type AudioValidation,
  AudioValidationSchema,
} from "@app/validation/moduleConfig/audio.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface AudioModuleConfigProps {
  onFormInit: DynamicFormFormInit<AudioValidation>;
}

export const Audio = ({ onFormInit }: AudioModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "audio" });
  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: AudioValidation) => {
    if (deepCompareConfig(moduleConfig.audio, data, true)) {
      removeChange({ type: "moduleConfig", variant: "audio" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "audio" },
      data,
      moduleConfig.audio,
    );
  };

  return (
    <DynamicForm<AudioValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={AudioValidationSchema}
      defaultValues={moduleConfig.audio}
      values={getEffectiveModuleConfig("audio")}
      fieldGroups={[
        {
          label: t("audio.title"),
          description: t("audio.description"),
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
                enumValue:
                  Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud,
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
