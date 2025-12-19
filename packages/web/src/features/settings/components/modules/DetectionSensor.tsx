import { useModuleConfigForm } from "../../hooks/useModuleConfigForm";
import {
  type DetectionSensorValidation,
  DetectionSensorValidationSchema,
} from "../../validation/moduleConfig/detectionSensor";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields";
import { Protobuf } from "@meshtastic/core";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading";
import { useTranslation } from "react-i18next";

export const DetectionSensor = () => {
  const { t } = useTranslation("moduleConfig");
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<DetectionSensorValidation>({
      moduleConfigType: "detectionSensor",
      schema: DetectionSensorValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<DetectionSensorValidation>[] = [
    {
      label: t("detectionSensor.title"),
      description: t("detectionSensor.description"),
      fields: [
        {
          type: "toggle",
          name: "enabled",
          label: t("detectionSensor.enabled.label"),
          description: t("detectionSensor.enabled.description"),
        },
        {
          type: "number",
          name: "minimumBroadcastSecs",
          label: t("detectionSensor.minimumBroadcastSecs.label"),
          description: t("detectionSensor.minimumBroadcastSecs.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "stateBroadcastSecs",
          label: t("detectionSensor.stateBroadcastSecs.label"),
          description: t("detectionSensor.stateBroadcastSecs.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "toggle",
          name: "sendBell",
          label: t("detectionSensor.sendBell.label"),
          description: t("detectionSensor.sendBell.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "text",
          name: "name",
          label: t("detectionSensor.name.label"),
          description: t("detectionSensor.name.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "monitorPin",
          label: t("detectionSensor.monitorPin.label"),
          description: t("detectionSensor.monitorPin.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "select",
          name: "detectionTriggerType",
          label: t("detectionSensor.detectionTriggerType.label"),
          description: t("detectionSensor.detectionTriggerType.description"),
          disabledBy: [{ fieldName: "enabled" }],
          properties: {
            enumValue:
              Protobuf.ModuleConfig
                .ModuleConfig_DetectionSensorConfig_TriggerType,
          },
        },
        {
          type: "toggle",
          name: "usePullup",
          label: t("detectionSensor.usePullup.label"),
          description: t("detectionSensor.usePullup.description"),
          disabledBy: [{ fieldName: "enabled" }],
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
