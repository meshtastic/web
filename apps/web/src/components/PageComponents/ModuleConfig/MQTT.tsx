import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import { type MqttValidation, MqttValidationSchema } from "@app/validation/moduleConfig/mqtt.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface MqttModuleConfigProps {
  onFormInit: DynamicFormFormInit<MqttValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { mqtt?: Protobuf.ModuleConfig.ModuleConfig_MQTTConfig },
  peek: () => ({}) as { mqtt?: Protobuf.ModuleConfig.ModuleConfig_MQTTConfig },
  subscribe: () => () => {},
} as const;

const populateDefaults = (cfg: Protobuf.ModuleConfig.ModuleConfig_MQTTConfig | undefined) =>
  cfg
    ? {
        ...cfg,
        mapReportSettings: cfg.mapReportSettings ?? {
          publishIntervalSecs: 3600,
          positionPrecision: 13,
          shouldReportLocation: false,
        },
      }
    : undefined;

export const MQTT = ({ onFormInit }: MqttModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "mqtt" });

  const { config, moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);

  const effectiveMqtt =
    modules.mqtt ??
    (getEffectiveModuleConfig("mqtt") as Protobuf.ModuleConfig.ModuleConfig_MQTTConfig | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: MqttValidation) => {
    if (!editor) return;
    const payload = {
      ...data,
      mapReportSettings: create(
        Protobuf.ModuleConfig.ModuleConfig_MapReportSettingsSchema,
        data.mapReportSettings,
      ),
    };
    editor.setModuleSection(
      "mqtt",
      payload as unknown as Protobuf.ModuleConfig.ModuleConfig_MQTTConfig,
    );
  };

  const positionPrecisionOptions =
    config.display?.units === 0
      ? {
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km23")]: 10,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km12")]: 11,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km5_8")]: 12,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km2_9")]: 13,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km1_5")]: 14,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_m700")]: 15,
        }
      : {
          [t("mqtt.mapReportSettings.positionPrecision.options.imperial_mi15")]: 10,
          [t("mqtt.mapReportSettings.positionPrecision.options.imperial_mi7_3")]: 11,
          [t("mqtt.mapReportSettings.positionPrecision.options.imperial_mi3_6")]: 12,
          [t("mqtt.mapReportSettings.positionPrecision.options.imperial_mi1_8")]: 13,
          [t("mqtt.mapReportSettings.positionPrecision.options.imperial_mi0_9")]: 14,
          [t("mqtt.mapReportSettings.positionPrecision.options.imperial_mi0_5")]: 15,
        };

  return (
    <DynamicForm<MqttValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={MqttValidationSchema}
      defaultValues={populateDefaults(moduleConfig.mqtt)}
      values={populateDefaults(effectiveMqtt)}
      fieldGroups={[
        {
          label: t("mqtt.mqttConfigCard.label"),
          description: t("mqtt.mqttConfigCard.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("mqtt.enabled.label"),
              description: t("mqtt.enabled.description"),
            },
            {
              type: "text",
              name: "address",
              label: t("mqtt.address.label"),
              description: t("mqtt.address.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
            {
              type: "text",
              name: "username",
              label: t("mqtt.username.label"),
              description: t("mqtt.username.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
            {
              type: "password",
              name: "password",
              label: t("mqtt.password.label"),
              description: t("mqtt.password.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
            {
              type: "toggle",
              name: "encryptionEnabled",
              label: t("mqtt.encryptionEnabled.label"),
              description: t("mqtt.encryptionEnabled.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
            {
              type: "toggle",
              name: "jsonEnabled",
              label: t("mqtt.jsonEnabled.label"),
              description: t("mqtt.jsonEnabled.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
            {
              type: "toggle",
              name: "tlsEnabled",
              label: t("mqtt.tlsEnabled.label"),
              description: t("mqtt.tlsEnabled.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
            {
              type: "text",
              name: "root",
              label: t("mqtt.root.label"),
              description: t("mqtt.root.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
            {
              type: "toggle",
              name: "proxyToClientEnabled",
              label: t("mqtt.proxyToClientEnabled.label"),
              description: t("mqtt.proxyToClientEnabled.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
          ],
        },
        {
          label: t("mqtt.mapReportingCard.label"),
          description: t("mqtt.mapReportingCard.description"),
          fields: [
            {
              type: "toggle",
              name: "mapReportingEnabled",
              label: t("mqtt.mapReportingEnabled.label"),
              description: t("mqtt.mapReportingEnabled.description"),
              disabledBy: [{ fieldName: "enabled" }],
            },
            {
              type: "toggle",
              name: "mapReportSettings.shouldReportLocation",
              label: t("mqtt.mapReportSettings.shouldReportLocation.label"),
              description: t("mqtt.mapReportSettings.shouldReportLocation.description"),
              disabledBy: [{ fieldName: "enabled" }, { fieldName: "mapReportingEnabled" }],
            },
            {
              type: "select",
              name: "mapReportSettings.positionPrecision",
              label: t("mqtt.mapReportSettings.positionPrecision.label"),
              description: t("mqtt.mapReportSettings.positionPrecision.description"),
              properties: { enumValue: positionPrecisionOptions },
              disabledBy: [
                { fieldName: "enabled" },
                { fieldName: "mapReportingEnabled" },
                { fieldName: "mapReportSettings.shouldReportLocation" },
              ],
            },
            {
              type: "number",
              name: "mapReportSettings.publishIntervalSecs",
              label: t("mqtt.mapReportSettings.publishIntervalSecs.label"),
              description: t("mqtt.mapReportSettings.publishIntervalSecs.description"),
              properties: { suffix: t("unit.second.plural") },
              disabledBy: [
                { fieldName: "enabled" },
                { fieldName: "mapReportingEnabled" },
                { fieldName: "mapReportSettings.shouldReportLocation" },
              ],
            },
          ],
        },
      ]}
    />
  );
};
