import { useDevice } from "@app/core/stores/deviceStore.ts";
import type { DetectionSensorValidation } from "@app/validation/moduleConfig/detectionSensor.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const DetectionSensor = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation("translation");

  const onSubmit = (data: DetectionSensorValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "detectionSensor",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<DetectionSensorValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.detectionSensor}
      fieldGroups={[
        {
          label: t("Detection Sensor Settings"),
          description: t("Settings for the Detection Sensor module"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Enabled"),
              description: t("Enable or disable Detection Sensor Module"),
            },
            {
              type: "number",
              name: "minimumBroadcastSecs",
              label: t("Minimum Broadcast Seconds"),
              description: t(
                "The interval in seconds of how often we can send a message to the mesh when a state change is detected"
              ),
              properties: {
                suffix: "Seconds",
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
              label: t("State Broadcast Seconds"),
              description: t(
                "The interval in seconds of how often we should send a message to the mesh with the current state regardless of changes"
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "sendBell",
              label: t("Send Bell"),
              description: t("Send ASCII bell with alert message"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "text",
              name: "name",
              label: t("Friendly Name"),
              description: t(
                "Used to format the message sent to mesh, max 20 Characters"
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "monitorPin",
              label: t("Monitor Pin"),
              description: t("The GPIO pin to monitor for state changes"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "detectionTriggeredHigh",
              label: t("Detection Triggered High"),
              description: t(
                "Whether or not the GPIO pin state detection is triggered on HIGH (1), otherwise LOW (0)"
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
              label: t("Use Pullup"),
              description: t(
                "Whether or not use INPUT_PULLUP mode for GPIO pin"
              ),
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
