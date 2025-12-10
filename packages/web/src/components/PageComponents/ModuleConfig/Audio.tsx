import { useModuleConfigForm } from "@app/pages/Settings/hooks/useModuleConfigForm";
import {
  type AudioValidation,
  AudioValidationSchema,
} from "@app/validation/moduleConfig/audio";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@components/Form/ConfigFormFields";
import { Protobuf } from "@meshtastic/core";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { useTranslation } from "react-i18next";

export const Audio = () => {
  const { t } = useTranslation("moduleConfig");
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<AudioValidation>({
      moduleConfigType: "audio",
      schema: AudioValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<AudioValidation>[] = [
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
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
