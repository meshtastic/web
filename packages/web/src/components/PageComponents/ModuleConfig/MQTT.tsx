import { useModuleConfigForm } from "@app/pages/Settings/hooks/useModuleConfigForm";
import {
  type MqttValidation,
  MqttValidationSchema,
} from "@app/validation/moduleConfig/mqtt";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@components/Form/ConfigFormFields";
import { useDevice } from "@core/stores";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { useTranslation } from "react-i18next";

export const MQTT = () => {
  const { t } = useTranslation("moduleConfig");
  const { config } = useDevice();

  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<MqttValidation>({
      moduleConfigType: "mqtt",
      schema: MqttValidationSchema,
      transformDefaults: (cfg) =>
        cfg
          ? {
              ...cfg,
              mapReportSettings: cfg.mapReportSettings ?? {
                publishIntervalSecs: 0,
                positionPrecision: 10,
              },
            }
          : undefined,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const positionPrecisionOptions =
    config.display?.units === 0
      ? {
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km23")]:
            10,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km12")]:
            11,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km5_8")]:
            12,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km2_9")]:
            13,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_km1_5")]:
            14,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_m700")]:
            15,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_m350")]:
            16,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_m200")]:
            17,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_m90")]:
            18,
          [t("mqtt.mapReportSettings.positionPrecision.options.metric_m50")]:
            19,
        }
      : {
          [t("mqtt.mapReportSettings.positionPrecision.options.imperial_mi15")]:
            10,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_mi7_3",
          )]: 11,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_mi3_6",
          )]: 12,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_mi1_8",
          )]: 13,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_mi0_9",
          )]: 14,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_mi0_5",
          )]: 15,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_mi0_2",
          )]: 16,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_ft600",
          )]: 17,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_ft300",
          )]: 18,
          [t(
            "mqtt.mapReportSettings.positionPrecision.options.imperial_ft150",
          )]: 19,
        };

  const fieldGroups: FieldGroup<MqttValidation>[] = [
    {
      label: t("mqtt.title"),
      description: t("mqtt.description"),
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
        {
          type: "toggle",
          name: "mapReportingEnabled",
          label: t("mqtt.mapReportingEnabled.label"),
          description: t("mqtt.mapReportingEnabled.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "mapReportSettings.publishIntervalSecs",
          label: t("mqtt.mapReportSettings.publishIntervalSecs.label"),
          description: t(
            "mqtt.mapReportSettings.publishIntervalSecs.description",
          ),
          properties: {
            suffix: t("unit.second.plural"),
          },
          disabledBy: [
            { fieldName: "enabled" },
            { fieldName: "mapReportingEnabled" },
          ],
        },
        {
          type: "select",
          name: "mapReportSettings.positionPrecision",
          label: t("mqtt.mapReportSettings.positionPrecision.label"),
          description: t(
            "mqtt.mapReportSettings.positionPrecision.description",
          ),
          properties: {
            enumValue: positionPrecisionOptions,
          },
          disabledBy: [
            { fieldName: "enabled" },
            { fieldName: "mapReportingEnabled" },
          ],
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
