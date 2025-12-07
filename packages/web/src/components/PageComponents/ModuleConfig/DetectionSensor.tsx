import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type DetectionSensorValidation,
  DetectionSensorValidationSchema,
} from "@app/validation/moduleConfig/detectionSensor.ts";
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

interface DetectionSensorModuleConfigProps {
  onFormInit: DynamicFormFormInit<DetectionSensorValidation>;
}

export const DetectionSensor = ({
  onFormInit,
}: DetectionSensorModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "detectionSensor" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");
  const section = { type: "moduleConfig", variant: "detectionSensor" } as const;

  const onSubmit = (data: DetectionSensorValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.detectionSensor;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof DetectionSensorValidation>).forEach(
      (fieldName) => {
        const newValue = data[fieldName];
        const oldValue = originalData[fieldName];

        if (newValue !== oldValue) {
          trackChange(section, fieldName as string, newValue, oldValue);
        } else {
          removeFieldChange(section, fieldName as string);
        }
      },
    );
  };

  const fieldGroups = useMemo(
    () => [
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
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "number",
            name: "stateBroadcastSecs",
            label: t("detectionSensor.stateBroadcastSecs.label"),
            description: t("detectionSensor.stateBroadcastSecs.description"),
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "toggle",
            name: "sendBell",
            label: t("detectionSensor.sendBell.label"),
            description: t("detectionSensor.sendBell.description"),
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "text",
            name: "name",
            label: t("detectionSensor.name.label"),
            description: t("detectionSensor.name.description"),
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "number",
            name: "monitorPin",
            label: t("detectionSensor.monitorPin.label"),
            description: t("detectionSensor.monitorPin.description"),
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "select",
            name: "detectionTriggerType",
            label: t("detectionSensor.detectionTriggerType.label"),
            description: t("detectionSensor.detectionTriggerType.description"),
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
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
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
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
    <DynamicForm<DetectionSensorValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DetectionSensorValidationSchema}
      defaultValues={moduleConfig.detectionSensor}
      values={getEffectiveModuleConfig("detectionSensor")}
      fieldGroups={fieldGroups}
    />
  );
};
