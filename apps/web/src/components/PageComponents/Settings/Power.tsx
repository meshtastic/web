import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type PowerValidation,
  PowerValidationSchema,
  toPowerConfig,
  toPowerFormValues,
} from "@app/validation/config/power.ts";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import type { FieldProps } from "@components/Form/DynamicFormField.tsx";
import { useDevice } from "@core/stores";
import type { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface PowerConfigProps {
  onFormInit: DynamicFormFormInit<PowerValidation>;
}

const EMPTY_RADIO_SIGNAL = {
  value: {} as { power?: Protobuf.Config.Config_PowerConfig },
  peek: () => ({}) as { power?: Protobuf.Config.Config_PowerConfig },
  subscribe: () => () => {},
} as const;

export const Power = ({ onFormInit }: PowerConfigProps) => {
  useWaitForConfig({ configCase: "power" });

  const { config, getEffectiveConfig } = useDevice();
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO_SIGNAL);
  const effective =
    radio.power ??
    (getEffectiveConfig("power") as
      | Protobuf.Config.Config_PowerConfig
      | undefined);

  const { t } = useTranslation("config");

  // The form is created here, not in DynamicForm, so the ADC ratio field can
  // follow the override switch.
  const formMethods = useForm<PowerValidation>({
    mode: "onChange",
    defaultValues: toPowerFormValues(config.power),
    resolver: createZodResolver(PowerValidationSchema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: toPowerFormValues(effective),
  });
  const { control, getValues, setValue } = formMethods;
  const adcOverrideEnabled = useWatch({ control, name: "adcOverrideEnabled" });

  useEffect(() => {
    onFormInit(formMethods);
  }, [onFormInit, formMethods]);

  const onSubmit = (data: PowerValidation) => {
    if (!editor) return;
    editor.setRadioSection(
      "power",
      toPowerConfig(data) as unknown as Protobuf.Config.Config_PowerConfig,
    );
  };

  const adcFields: FieldProps<PowerValidation>[] = [
    {
      type: "toggle",
      name: "adcOverrideEnabled",
      label: t("power.adcOverrideEnabled.label"),
      description: t("power.adcOverrideEnabled.description"),
      // As on Android: switching on starts from a ratio of 1, off clears it.
      inputChange: (checked) => {
        const ratio = getValues("adcMultiplierOverride");
        if (checked && !(Number(ratio) > 0)) {
          setValue("adcMultiplierOverride", 1, { shouldDirty: true });
        } else if (!checked) {
          setValue("adcMultiplierOverride", 0, { shouldDirty: true });
        }
      },
    },
  ];
  if (adcOverrideEnabled) {
    adcFields.push({
      type: "number",
      name: "adcMultiplierOverride",
      label: t("power.adcMultiplierOverride.label"),
      description: t("power.adcMultiplierOverride.description"),
      properties: { step: 0.0001 },
    });
  }

  return (
    <DynamicForm<PowerValidation>
      propMethods={formMethods}
      onSubmit={onSubmit}
      fieldGroups={[
        {
          label: t("power.powerConfig.label"),
          description: t("power.powerConfig.description"),
          fields: [
            {
              type: "toggle",
              name: "isPowerSaving",
              label: t("power.powerSavingEnabled.label"),
              description: t("power.powerSavingEnabled.description"),
            },
            {
              type: "number",
              name: "onBatteryShutdownAfterSecs",
              label: t("power.shutdownOnBatteryDelay.label"),
              description: t("power.shutdownOnBatteryDelay.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            ...adcFields,
            {
              type: "number",
              name: "waitBluetoothSecs",
              label: t("power.noConnectionBluetoothDisabled.label"),
              description: t("power.noConnectionBluetoothDisabled.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "number",
              name: "sdsSecs",
              label: t("power.superDeepSleepDuration.label"),
              description: t("power.superDeepSleepDuration.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "number",
              name: "minWakeSecs",
              label: t("power.minimumWakeTime.label"),
              description: t("power.minimumWakeTime.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "number",
              name: "deviceBatteryInaAddress",
              label: t("power.ina219Address.label"),
              description: t("power.ina219Address.description"),
            },
          ],
        },
      ]}
    />
  );
};
