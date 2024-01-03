import type { DeviceValidation } from "@app/validation/config/device.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const Device = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: DeviceValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "device",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<DeviceValidation>
      onSubmit={onSubmit}
      defaultValues={config.device}
      fieldGroups={[
        {
          label: "Device Settings",
          description: "Settings for the device",
          fields: [
            {
              type: "select",
              name: "role",
              label: "Role",
              description: "What role the device performs on the mesh",
              properties: {
                enumValue: Protobuf.Config.Config_DeviceConfig_Role,
                formatEnumName: true,
              },
            },
            {
              type: "toggle",
              name: "serialEnabled",
              label: "Serial Output Enabled",
              description: "Enable the device's serial console",
            },
            {
              type: "toggle",
              name: "debugLogEnabled",
              label: "Enabled Debug Log",
              description:
                "Output debugging information to the device's serial port (auto disables when serial client is connected)",
            },
            {
              type: "number",
              name: "buttonGpio",
              label: "Button Pin",
              description: "Button pin override",
            },
            {
              type: "number",
              name: "buzzerGpio",
              label: "Buzzer Pin",
              description: "Buzzer pin override",
            },
            {
              type: "select",
              name: "rebroadcastMode",
              label: "Rebroadcast Mode",
              description: "How to handle rebroadcasting",
              properties: {
                enumValue: Protobuf.Config.Config_DeviceConfig_RebroadcastMode,
                formatEnumName: true,
              },
            },
            {
              type: "number",
              name: "nodeInfoBroadcastSecs",
              label: "Node Info Broadcast Interval",
              description: "How often to broadcast node info",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "toggle",
              name: "doubleTapAsButtonPress",
              label: "Double Tap as Button Press",
              description: "Treat double tap as button press",
            },
            {
              type: "toggle",
              name: "isManaged",
              label: "Managed",
              description: "Is this device managed by a mesh administator",
            },
            {
              type: "toggle",
              name: "disableTripleClick",
              label: "Disable Triple Click",
              description: "Disable triple click",
            },
          ],
        },
      ]}
    />
  );
};
