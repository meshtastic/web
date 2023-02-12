import type { DeviceValidation } from "@app/validation/config/device.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm } from "@app/components/DynamicForm.js";

export const Device = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: DeviceValidation) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "device",
          value: data
        }
      })
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
              enumValue: Protobuf.Config_DeviceConfig_Role,
              formatEnumName: true
            },
            {
              type: "toggle",
              name: "serialEnabled",
              label: "Serial Output Enabled",
              description: "Disable the device's serial console"
            },
            {
              type: "toggle",
              name: "debugLogEnabled",
              label: "Enabled Debug Log",
              description:
                "Output debugging information to the device's serial port (auto disables when serial client is connected)"
            },
            {
              type: "number",
              name: "buttonGpio",
              label: "Button Pin",
              description: "Button pin override"
            },
            {
              type: "number",
              name: "buzzerGpio",
              label: "Buzzer Pin",
              description: "Buzzer pin override"
            },
            {
              type: "select",
              name: "rebroadcastMode",
              label: "Rebroadcast Mode",
              description: "How to handle rebroadcasting",
              enumValue: Protobuf.Config_DeviceConfig_RebroadcastMode,
              formatEnumName: true
            },
            {
              type: "number",
              name: "nodeInfoBroadcastSecs",
              label: "Node Info Broadcast Interval",
              description: "How often to broadcast node info",
              suffix: "Seconds"
            }
          ]
        }
      ]}
    />
  );
};
