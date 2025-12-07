import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type LoRaValidation,
  LoRaValidationSchema,
} from "@app/validation/config/lora.ts";
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
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface LoRaConfigProps {
  onFormInit: DynamicFormFormInit<LoRaValidation>;
}
export const LoRa = ({ onFormInit }: LoRaConfigProps) => {
  useWaitForConfig({ configCase: "lora" });

  const { config, getEffectiveConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("config");

  const section = { type: "config", variant: "lora" } as const;

  const fieldGroups = [
        {
          label: t("lora.title"),
          description: t("lora.description"),
          fields: [
            {
              type: "select",
              name: "region",
              label: t("lora.region.label"),
              description: t("lora.region.description"),
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_RegionCode,
              },
            },
            {
              type: "select",
              name: "hopLimit",
              label: t("lora.hopLimit.label"),
              description: t("lora.hopLimit.description"),
              properties: {
                enumValue: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
              },
            },
            {
              type: "number",
              name: "channelNum",
              label: t("lora.frequencySlot.label"),
              description: t("lora.frequencySlot.description"),
            },
            {
              type: "toggle",
              name: "ignoreMqtt",
              label: t("lora.ignoreMqtt.label"),
              description: t("lora.ignoreMqtt.description"),
            },
            {
              type: "toggle",
              name: "configOkToMqtt",
              label: t("lora.okToMqtt.label"),
              description: t("lora.okToMqtt.description"),
            },
          ],
        },
        {
          label: t("lora.waveformSettings.label"),
          description: t("lora.waveformSettings.description"),
          fields: [
            {
              type: "toggle",
              name: "usePreset",
              label: t("lora.usePreset.label"),
              description: t("lora.usePreset.description"),
            },
            {
              type: "select",
              name: "modemPreset",
              label: t("lora.modemPreset.label"),
              description: t("lora.modemPreset.description"),
              disabledBy: [
                {
                  fieldName: "usePreset",
                },
              ],
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_ModemPreset,
                formatEnumName: true,
              },
            },
            {
              type: "number",
              name: "bandwidth",
              label: t("lora.bandwidth.label"),
              description: t("lora.bandwidth.description"),
              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true,
                },
              ],
              properties: {
                suffix: t("unit.megahertz"),
              },
            },
            {
              type: "number",
              name: "spreadFactor",
              label: t("lora.spreadingFactor.label"),
              description: t("lora.spreadingFactor.description"),

              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true,
                },
              ],
              properties: {
                suffix: t("unit.cps"),
              },
            },
            {
              type: "number",
              name: "codingRate",
              label: t("lora.codingRate.label"),
              description: t("lora.codingRate.description"),
              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true,
                },
              ],
            },
          ],
        },
        {
          label: t("lora.radioSettings.label"),
          description: t("lora.radioSettings.description"),
          fields: [
            {
              type: "toggle",
              name: "txEnabled",
              label: t("lora.transmitEnabled.label"),
              description: t("lora.transmitEnabled.description"),
            },
            {
              type: "number",
              name: "txPower",
              label: t("lora.transmitPower.label"),
              description: t("lora.transmitPower.description"),
              properties: {
                suffix: t("unit.dbm"),
              },
            },
            {
              type: "toggle",
              name: "overrideDutyCycle",
              label: t("lora.overrideDutyCycle.label"),
              description: t("lora.overrideDutyCycle.description"),
            },
            {
              type: "number",
              name: "frequencyOffset",
              label: t("lora.frequencyOffset.label"),
              description: t("lora.frequencyOffset.description"),
              properties: {
                suffix: t("unit.hertz"),
              },
            },
            {
              type: "toggle",
              name: "sx126xRxBoostedGain",
              label: t("lora.boostedRxGain.label"),
              description: t("lora.boostedRxGain.description"),
            },
            {
              type: "number",
              name: "overrideFrequency",
              label: t("lora.overrideFrequency.label"),
              description: t("lora.overrideFrequency.description"),
              properties: {
                suffix: t("unit.megahertz"),
                step: 0.001,
              },
            },
          ],
        },
      ];

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  const onSubmit = (data: LoRaValidation) => {
    // Track individual field changes
    const originalData = config.lora;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof LoRaValidation>).forEach((fieldName) => {
      const newValue = data[fieldName];
      const oldValue = originalData[fieldName];

      if (newValue !== oldValue) {
        trackChange(section, fieldName as string, newValue, oldValue);
      } else {
        removeFieldChange(section, fieldName as string);
      }
    });
  };

  return (
    <DynamicForm<LoRaValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={LoRaValidationSchema}
      defaultValues={config.lora}
      values={getEffectiveConfig("lora")}
      fieldGroups={fieldGroups}
    />
  );
};
