import type { LoRaValidation } from "@app/validation/config/lora.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

export const LoRa = () => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: LoRaValidation) => {
    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<LoRaValidation>
      onSubmit={onSubmit}
      defaultValues={config.lora}
      fieldGroups={[
        {
          label: t("config_lora_groupLabel_meshSettings"),
          description: t("config_lora_groupDescription_meshSettings"),
          fields: [
            {
              type: "select",
              name: "region",
              label: t("config_lora_fieldLabel_region"),
              description: t("config_lora_fieldDescription_region"),
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_RegionCode,
              },
            },
            {
              type: "select",
              name: "hopLimit",
              label: t("config_lora_fieldLabel_hopLimit"),
              description: t("config_lora_fieldDescription_hopLimit"),
              properties: {
                enumValue: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
              },
            },
            {
              type: "number",
              name: "channelNum",
              label: t("config_lora_fieldLabel_frequencySlot"),
              description: t("config_lora_fieldDescription_frequencySlot"),
            },
            {
              type: "toggle",
              name: "ignoreMqtt",
              label: t("config_lora_fieldLabel_ignoreMqtt"),
              description: t("config_lora_fieldDescription_ignoreMqtt"),
            },
            {
              type: "toggle",
              name: "configOkToMqtt",
              label: t("config_lora_fieldLabel_okToMqtt"),
              description: t("config_lora_fieldDescription_okToMqtt"),
            },
          ],
        },
        {
          label: t("config_lora_groupLabel_waveformSettings"),
          description: t("config_lora_groupDescription_waveformSettings"),
          fields: [
            {
              type: "toggle",
              name: "usePreset",
              label: t("config_lora_fieldLabel_usePreset"),
              description: t("config_lora_fieldDescription_usePreset"),
            },
            {
              type: "select",
              name: "modemPreset",
              label: t("config_lora_fieldLabel_modemPreset"),
              description: t("config_lora_fieldDescription_modemPreset"),
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
              label: t("config_lora_fieldLabel_bandwidth"),
              description: t("config_lora_fieldDescription_bandwidth"),
              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true,
                },
              ],
              properties: {
                suffix: t("common_unit_megahertz"),
              },
            },
            {
              type: "number",
              name: "spreadFactor",
              label: t("config_lora_fieldLabel_spreadingFactor"),
              description: t("config_lora_fieldDescription_spreadingFactor"),

              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true,
                },
              ],
              properties: {
                suffix: t("common_unit_cps"),
              },
            },
            {
              type: "number",
              name: "codingRate",
              label: t("config_lora_fieldLabel_codingRate"),
              description: t("config_lora_fieldDescription_codingRate"),
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
          label: t("config_lora_groupLabel_radioSettings"),
          description: t("config_lora_groupDescription_radioSettings"),
          fields: [
            {
              type: "toggle",
              name: "txEnabled",
              label: t("config_lora_fieldLabel_transmitEnabled"),
              description: t("config_lora_fieldDescription_transmitEnabled"),
            },
            {
              type: "number",
              name: "txPower",
              label: t("config_lora_fieldLabel_transmitPower"),
              description: t("config_lora_fieldDescription_transmitPower"),
              properties: {
                suffix: t("common_unit_dbm"),
              },
            },
            {
              type: "toggle",
              name: "overrideDutyCycle",
              label: t("config_lora_fieldLabel_overrideDutyCycle"),
              description: t("config_lora_fieldDescription_overrideDutyCycle"),
            },
            {
              type: "number",
              name: "frequencyOffset",
              label: t("config_lora_fieldLabel_frequencyOffset"),
              description: t("config_lora_fieldDescription_frequencyOffset"),
              properties: {
                suffix: t("common_unit_hertz"),
              },
            },
            {
              type: "toggle",
              name: "sx126xRxBoostedGain",
              label: t("config_lora_fieldLabel_boostedRxGain"),
              description: t("config_lora_fieldDescription_boostedRxGain"),
            },
            {
              type: "number",
              name: "overrideFrequency",
              label: t("config_lora_fieldLabel_overrideFrequency"),
              description: t("config_lora_fieldDescription_overrideFrequency"),
              properties: {
                suffix: t("common_unit_megahertz"),
                step: 0.001,
              },
            },
          ],
        },
      ]}
    />
  );
};
