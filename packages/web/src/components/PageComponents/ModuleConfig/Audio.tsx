import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type AudioValidation,
  AudioValidationSchema,
} from "@app/validation/moduleConfig/audio.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  createFieldMetadata,
  useFieldRegistry,
} from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface AudioModuleConfigProps {
  onFormInit: DynamicFormFormInit<AudioValidation>;
}

export const Audio = ({ onFormInit }: AudioModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "audio" });
  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");

  const section = { type: "moduleConfig", variant: "audio" } as const;

  const onSubmit = (data: AudioValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.audio;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof AudioValidation>).forEach((fieldName) => {
      const newValue = data[fieldName];
      const oldValue = originalData[fieldName];

      if (newValue !== oldValue) {
        trackChange(section, fieldName as string, newValue, oldValue);
      } else {
        removeFieldChange(section, fieldName as string);
      }
    });
  };

  const fieldGroups = useMemo(
    () => [
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
    ],
    [t],
  );

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  return (
    <DynamicForm<AudioValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={AudioValidationSchema}
      defaultValues={moduleConfig.audio}
      values={getEffectiveModuleConfig("audio")}
      fieldGroups={fieldGroups}
    />
  );
};
