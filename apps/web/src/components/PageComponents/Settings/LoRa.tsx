import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  codingRateOverride,
  codingRateOverrides,
  hasPaFan,
  type LoRaValidation,
  makeLoRaValidationSchema,
  normalizeCodingRate,
  presetCodingRate,
} from "@app/validation/config/lora.ts";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import type { FieldProps } from "@components/Form/DynamicFormField.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useDevice } from "@core/stores";
import {
  getAllowedPresets,
  getAllowedRegions,
  getDefaultPreset,
  getLicensedOnlyRegions,
  pickEnumValues,
} from "@core/utils/loraPresets.ts";
import { firmwareAtLeast, Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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

  const { regionPresets, supportsFirmware28, metadata } =
    useDeviceCapabilities();
  const caps = useMemo(
    () => ({ regionPresets, supportsFirmware28 }),
    [regionPresets, supportsFirmware28],
  );
  const validationSchema = useMemo(
    () => makeLoRaValidationSchema(caps),
    [caps],
  );
  // Firmware 2.7.18+ applies a coding rate above the preset's own.
  const supportsCodingRateOverride =
    supportsFirmware28 ||
    firmwareAtLeast(metadata?.firmwareVersion ?? "", "2.7.18");
  const showPaFan = hasPaFan(useMyNodeAsProto()?.user?.hwModel);

  const toFormValues = (cfg: Protobuf.Config.Config_LoRaConfig | undefined) =>
    (cfg && supportsCodingRateOverride
      ? normalizeCodingRate(cfg)
      : cfg) as unknown as LoRaValidation;

  // The form is created here, not in DynamicForm, so the coding rate
  // override can follow Use Preset and the selected preset.
  const formMethods = useForm<LoRaValidation>({
    mode: "onChange",
    defaultValues: toFormValues(config.lora),
    resolver: createZodResolver(validationSchema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: toFormValues(effectiveLora),
  });
  const { control, getValues, setValue } = formMethods;
  const [usePreset, modemPreset] = useWatch({
    control,
    name: ["usePreset", "modemPreset"],
  });

  useEffect(() => {
    onFormInit(formMethods);
  }, [onFormInit, formMethods]);

  // Keep an override only while it still raises the newly chosen preset.
  const onPresetChange = (
    next: Protobuf.Config.Config_LoRaConfig_ModemPreset,
  ) => {
    if (!supportsCodingRateOverride || !getValues("usePreset")) return;
    const current = Number(getValues("codingRate"));
    const kept = codingRateOverride(next, current);
    if (kept !== current) {
      setValue("codingRate", kept, { shouldDirty: true });
    }
  };

  // The region picked in the form, which may not be saved yet. A pick only
  // holds while the effective config still has the region it was made
  // against; once it is saved or discarded the effective config wins.
  const effectiveRegion = effectiveLora?.region;
  const [picked, setPicked] = useState<{
    region: Protobuf.Config.Config_LoRaConfig_RegionCode;
    over: Protobuf.Config.Config_LoRaConfig_RegionCode | undefined;
  }>();
  const region =
    picked && picked.over === effectiveRegion ? picked.region : effectiveRegion;

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
      setValue("modemPreset", defaultPreset, { shouldDirty: true });
      onPresetChange(defaultPreset);
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
      (supportsCodingRateOverride
        ? normalizeCodingRate(data)
        : data) as unknown as Protobuf.Config.Config_LoRaConfig,
    );
  };

  // Coding Rate Override: shown with presets on, like Android. Offers
  // "Preset default" (stored as 0) and the rates above the preset's own.
  const presetRate =
    modemPreset === undefined ? undefined : presetCodingRate(modemPreset);
  const codingRateOverrideFields: FieldProps<LoRaValidation>[] = [];
  if (
    supportsCodingRateOverride &&
    usePreset &&
    modemPreset !== undefined &&
    presetRate !== undefined
  ) {
    const overrides = codingRateOverrides(modemPreset);
    const fraction = (rate: number) =>
      t("lora.codingRateOverride.fraction", { rate });
    codingRateOverrideFields.push({
      type: "select",
      name: "codingRate",
      label: t("lora.codingRateOverride.label"),
      description:
        overrides.length === 0
          ? t("lora.codingRateOverride.maxDescription")
          : t("lora.codingRateOverride.description"),
      disabled: overrides.length === 0,
      properties: {
        enumValue: Object.fromEntries([
          [
            t("lora.codingRateOverride.presetDefault", {
              rate: fraction(presetRate),
              // Plain text in a select option; keep the "/" as is.
              interpolation: { escapeValue: false },
            }),
            0,
          ],
          ...overrides.map((rate) => [fraction(rate), rate]),
        ]),
      },
    });
  }

  // As on Android, presets on shows the preset (and its coding rate
  // override); presets off shows the manual modem settings instead.
  const modemFields: FieldProps<LoRaValidation>[] = usePreset
    ? [
        {
          type: "select",
          name: "modemPreset",
          label: t("lora.modemPreset.label"),
          description:
            defaultPreset === undefined
              ? t("lora.modemPreset.description")
              : t("lora.modemPreset.descriptionForRegion"),
          selectChange: (value) =>
            onPresetChange(
              Number.parseInt(
                value,
                10,
              ) as Protobuf.Config.Config_LoRaConfig_ModemPreset,
            ),
          properties: {
            enumValue: presetOptions,
            formatEnumName: true,
            optionSuffixes: presetSuffixes,
          },
        },
        ...codingRateOverrideFields,
      ]
    : [
        {
          type: "number",
          name: "bandwidth",
          label: t("lora.bandwidth.label"),
          description: t("lora.bandwidth.description"),
          properties: { suffix: t("unit.kilohertz") },
        },
        {
          type: "number",
          name: "spreadFactor",
          label: t("lora.spreadingFactor.label"),
          description: t("lora.spreadingFactor.description"),
          properties: { suffix: t("unit.cps") },
        },
        {
          type: "number",
          name: "codingRate",
          label: t("lora.codingRate.label"),
          description: t("lora.codingRate.description"),
        },
      ];

  const paFanFields: FieldProps<LoRaValidation>[] = showPaFan
    ? [
        {
          type: "toggle",
          name: "paFanDisabled",
          label: t("lora.paFanDisabled.label"),
          description: t("lora.paFanDisabled.description"),
        },
      ]
    : [];

  return (
    <DynamicForm<LoRaValidation>
      propMethods={formMethods}
      onSubmit={onSubmit}
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
            ...modemFields,
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
            ...paFanFields,
          ],
        },
      ]}
    />
  );
};
