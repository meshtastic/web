import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type LoRaValidation,
  makeLoRaValidationSchema,
} from "@app/validation/config/lora.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useDevice } from "@core/stores";
import {
  getAllowedPresets,
  getAllowedRegions,
  getDefaultPreset,
  getLicensedOnlyRegions,
  pickEnumValues,
} from "@core/utils/loraPresets.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface LoRaConfigProps {
  onFormInit: DynamicFormFormInit<LoRaValidation>;
}

const EMPTY_RADIO_SIGNAL = {
  value: {} as { lora?: Protobuf.Config.Config_LoRaConfig },
  peek: () => ({}) as { lora?: Protobuf.Config.Config_LoRaConfig },
  subscribe: () => () => {},
} as const;

export const LoRa = ({ onFormInit }: LoRaConfigProps) => {
  useWaitForConfig({ configCase: "lora" });

  const { config, getEffectiveConfig } = useDevice();
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO_SIGNAL);

  const effectiveLora =
    radio.lora ??
    (getEffectiveConfig("lora") as
      | Protobuf.Config.Config_LoRaConfig
      | undefined);

  const { t } = useTranslation("config");

  const { regionPresets, supportsFirmware28 } = useDeviceCapabilities();
  const caps = useMemo(
    () => ({ regionPresets, supportsFirmware28 }),
    [regionPresets, supportsFirmware28],
  );
  const validationSchema = useMemo(
    () => makeLoRaValidationSchema(caps),
    [caps],
  );

  // The region picked in the form, which may not be saved yet. A pick only
  // holds while the effective config still has the region it was made
  // against; once it is saved or discarded the effective config wins.
  const formRef = useRef<UseFormReturn<LoRaValidation> | undefined>(undefined);
  const effectiveRegion = effectiveLora?.region;
  const [picked, setPicked] = useState<{
    region: Protobuf.Config.Config_LoRaConfig_RegionCode;
    over: Protobuf.Config.Config_LoRaConfig_RegionCode | undefined;
  }>();
  const region =
    picked && picked.over === effectiveRegion ? picked.region : effectiveRegion;

  const handleFormInit = useCallback<DynamicFormFormInit<LoRaValidation>>(
    (methods) => {
      formRef.current = methods;
      onFormInit(methods);
    },
    [onFormInit],
  );

  const onRegionChange = (value: string) => {
    const next = Number.parseInt(
      value,
      10,
    ) as Protobuf.Config.Config_LoRaConfig_RegionCode;
    setPicked({ region: next, over: effectiveRegion });
    // Firmware 2.8 asks clients to select the region's default preset when
    // switching regions.
    const defaultPreset = getDefaultPreset(regionPresets, next);
    if (defaultPreset !== undefined) {
      formRef.current?.setValue("modemPreset", defaultPreset, {
        shouldDirty: true,
      });
    }
  };

  const regionOptions = pickEnumValues(
    Protobuf.Config.Config_LoRaConfig_RegionCode,
    getAllowedRegions(caps),
    effectiveLora?.region,
  );
  const regionSuffixes = Object.fromEntries(
    getLicensedOnlyRegions(regionPresets).map((r) => [
      r,
      t("lora.region.licensedOnlySuffix"),
    ]),
  );

  const presetOptions = pickEnumValues(
    Protobuf.Config.Config_LoRaConfig_ModemPreset,
    getAllowedPresets(caps, region),
    effectiveLora?.modemPreset,
  );
  const defaultPreset = getDefaultPreset(regionPresets, region);
  const presetSuffixes =
    defaultPreset === undefined
      ? undefined
      : { [defaultPreset]: t("lora.modemPreset.defaultSuffix") };

  const onSubmit = (data: LoRaValidation) => {
    if (!editor) return;
    editor.setRadioSection(
      "lora",
      data as unknown as Protobuf.Config.Config_LoRaConfig,
    );
  };

  return (
    <DynamicForm<LoRaValidation>
      onSubmit={onSubmit}
      onFormInit={handleFormInit}
      validationSchema={validationSchema}
      defaultValues={config.lora}
      values={effectiveLora}
      fieldGroups={[
        {
          label: t("lora.optionsCard.label"),
          description: t("lora.optionsCard.description"),
          fields: [
            {
              type: "select",
              name: "region",
              label: t("lora.region.label"),
              description: t("lora.region.description"),
              selectChange: onRegionChange,
              properties: {
                enumValue: regionOptions,
                optionSuffixes: regionSuffixes,
              },
            },
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
              description:
                defaultPreset === undefined
                  ? t("lora.modemPreset.description")
                  : t("lora.modemPreset.descriptionForRegion"),
              disabledBy: [{ fieldName: "usePreset" }],
              properties: {
                enumValue: presetOptions,
                formatEnumName: true,
                optionSuffixes: presetSuffixes,
              },
            },
            {
              type: "number",
              name: "bandwidth",
              label: t("lora.bandwidth.label"),
              description: t("lora.bandwidth.description"),
              disabledBy: [{ fieldName: "usePreset", invert: true }],
              properties: { suffix: t("unit.kilohertz") },
            },
            {
              type: "number",
              name: "spreadFactor",
              label: t("lora.spreadingFactor.label"),
              description: t("lora.spreadingFactor.description"),
              disabledBy: [{ fieldName: "usePreset", invert: true }],
              properties: { suffix: t("unit.cps") },
            },
            {
              type: "number",
              name: "codingRate",
              label: t("lora.codingRate.label"),
              description: t("lora.codingRate.description"),
              disabledBy: [{ fieldName: "usePreset", invert: true }],
            },
          ],
        },
        {
          label: t("lora.advancedCard.label"),
          description: t("lora.advancedCard.description"),
          fields: [
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
            {
              type: "toggle",
              name: "txEnabled",
              label: t("lora.transmitEnabled.label"),
              description: t("lora.transmitEnabled.description"),
            },
            {
              type: "toggle",
              name: "overrideDutyCycle",
              label: t("lora.overrideDutyCycle.label"),
              description: t("lora.overrideDutyCycle.description"),
            },
            {
              type: "select",
              name: "hopLimit",
              label: t("lora.hopLimit.label"),
              description: t("lora.hopLimit.description"),
              properties: {
                enumValue: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
              },
            },
            {
              type: "number",
              name: "channelNum",
              label: t("lora.frequencySlot.label"),
              description: t("lora.frequencySlot.description"),
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
            {
              type: "number",
              name: "txPower",
              label: t("lora.transmitPower.label"),
              description: t("lora.transmitPower.description"),
              properties: { suffix: t("unit.dbm") },
            },
            {
              type: "select",
              name: "femLnaMode",
              label: t("lora.femLnaMode.label"),
              description: t("lora.femLnaMode.description"),
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_FEM_LNA_Mode,
                formatEnumName: true,
              },
            },
            {
              type: "toggle",
              name: "serialHalOnly",
              label: t("lora.serialHalOnly.label"),
              description: t("lora.serialHalOnly.description"),
            },
          ],
        },
      ]}
    />
  );
};
