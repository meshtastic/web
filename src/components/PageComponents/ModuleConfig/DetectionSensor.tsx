import { useDevice } from "@core/stores/deviceStore.ts";
import type { DetectionSensorValidation } from "@app/validation/moduleConfig/detectionSensor.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

export const DetectionSensor = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: DetectionSensorValidation) => {
    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "detectionSensor",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<DetectionSensorValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.detectionSensor}
      fieldGroups={[
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
              description: t(
                "detectionSensor.minimumBroadcastSecs.description",
              ),
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
              type: "toggle",
              name: "detectionTriggeredHigh",
              label: t("detectionSensor.detectionTriggeredHigh.label"),
              description: t(
                "detectionSensor.detectionTriggeredHigh.description",
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
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
      ]}
    />
  );
};
