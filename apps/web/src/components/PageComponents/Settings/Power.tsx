import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import { type PowerValidation, PowerValidationSchema } from "@app/validation/config/power.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
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
    radio.power ?? (getEffectiveConfig("power") as Protobuf.Config.Config_PowerConfig | undefined);

  const { t } = useTranslation("config");

  const onSubmit = (data: PowerValidation) => {
    if (!editor) return;
    editor.setRadioSection("power", data as unknown as Protobuf.Config.Config_PowerConfig);
  };

  return (
    <DynamicForm<PowerValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={PowerValidationSchema}
      defaultValues={config.power}
      values={effective}
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
            {
              type: "number",
              name: "adcMultiplierOverride",
              label: t("power.adcMultiplierOverride.label"),
              description: t("power.adcMultiplierOverride.description"),
              properties: { step: 0.0001 },
            },
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
