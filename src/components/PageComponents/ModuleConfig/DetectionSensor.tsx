import { useDevice } from "@app/core/stores/deviceStore.js";
import type { DetectionSensorValidation } from "@app/validation/moduleConfig/detectionSensor.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { Protobuf } from "@meshtastic/js";

export const DetectionSensor = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: DetectionSensorValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
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
          label: "Detection Sensor Settings",
          description: "Settings for the Detection Sensor module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Enabled",
              description: "Enable or disable Detection Sensor Module",
            },
            {
              type: "number",
              name: "minimumBroadcastSecs",
              label: "Minimum Broadcast Seconds",
              description:
                "The interval in seconds of how often we can send a message to the mesh when a state change is detected",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "stateBroadcastSecs",
              label: "State Broadcast Seconds",
              description:
                "The interval in seconds of how often we should send a message to the mesh with the current state regardless of changes",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "sendBell",
              label: "Send Bell",
              description: "Send ASCII bell with alert message",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "text",
              name: "name",
              label: "Friendly Name",
              description:
                "Used to format the message sent to mesh, max 20 Characters",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "monitorPin",
              label: "Monitor Pin",
              description: "The GPIO pin to monitor for state changes",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "detectionTriggeredHigh",
              label: "Detection Triggered High",
              description:
                "Whether or not the GPIO pin state detection is triggered on HIGH (1), otherwise LOW (0)",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "usePullup",
              label: "Use Pullup",
              description: "Whether or not use INPUT_PULLUP mode for GPIO pin",
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
