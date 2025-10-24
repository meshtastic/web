import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type DetectionSensorValidation,
  DetectionSensorValidationSchema,
} from "@app/validation/moduleConfig/detectionSensor.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface DetectionSensorModuleConfigProps {
  onFormInit: DynamicFormFormInit<DetectionSensorValidation>;
}

export const DetectionSensor = ({
  onFormInit,
}: DetectionSensorModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "detectionSensor" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: DetectionSensorValidation) => {
    if (deepCompareConfig(moduleConfig.detectionSensor, data, true)) {
      removeChange({ type: "moduleConfig", variant: "detectionSensor" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "detectionSensor" },
      data,
      moduleConfig.detectionSensor,
    );
  };

  return (
    <DynamicForm<DetectionSensorValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DetectionSensorValidationSchema}
      defaultValues={moduleConfig.detectionSensor}
      values={getEffectiveModuleConfig("detectionSensor")}
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
              type: "select",
              name: "detectionTriggerType",
              label: t("detectionSensor.detectionTriggerType.label"),
              description: t(
                "detectionSensor.detectionTriggerType.description",
              ),
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
      ]}
    />
  );
};
