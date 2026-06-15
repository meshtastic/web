import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type DetectionSensorValidation,
  DetectionSensorValidationSchema,
} from "@app/validation/moduleConfig/detectionSensor.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface DetectionSensorModuleConfigProps {
  onFormInit: DynamicFormFormInit<DetectionSensorValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { detectionSensor?: Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig },
  peek: () =>
    ({}) as { detectionSensor?: Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig },
  subscribe: () => () => {},
} as const;

export const DetectionSensor = ({ onFormInit }: DetectionSensorModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "detectionSensor" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.detectionSensor ??
    (getEffectiveModuleConfig("detectionSensor") as
      | Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: DetectionSensorValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "detectionSensor",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig,
    );
  };

  return (
    <DynamicForm<DetectionSensorValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DetectionSensorValidationSchema}
      defaultValues={moduleConfig.detectionSensor}
      values={effective}
      fieldGroups={[
        {
          label: t("detectionSensor.detectionSensorConfig.label"),
          description: t("detectionSensor.detectionSensorConfig.description"),
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
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "number",
              name: "stateBroadcastSecs",
              label: t("detectionSensor.stateBroadcastSecs.label"),
              description: t("detectionSensor.stateBroadcastSecs.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "toggle",
              name: "sendBell",
              label: t("detectionSensor.sendBell.label"),
              description: t("detectionSensor.sendBell.description"),
            },
            {
              type: "text",
              name: "name",
              label: t("detectionSensor.name.label"),
              description: t("detectionSensor.name.description"),
            },
            {
              type: "number",
              name: "monitorPin",
              label: t("detectionSensor.monitorPin.label"),
              description: t("detectionSensor.monitorPin.description"),
            },
            {
              type: "select",
              name: "detectionTriggerType",
              label: t("detectionSensor.detectionTriggerType.label"),
              description: t("detectionSensor.detectionTriggerType.description"),
              properties: {
                enumValue: Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig_TriggerType,
                formatEnumName: true,
              },
            },
            {
              type: "toggle",
              name: "usePullup",
              label: t("detectionSensor.usePullup.label"),
              description: t("detectionSensor.usePullup.description"),
            },
          ],
        },
      ]}
    />
  );
};
