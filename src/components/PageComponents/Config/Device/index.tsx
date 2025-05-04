import type { DeviceValidation } from "@app/validation/config/device.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useUnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog.ts";

export const Device = () => {
  const { config, setWorkingConfig } = useDevice();
  const { validateRoleSelection } = useUnsafeRolesDialog();

  const onSubmit = (data: DeviceValidation) => {
    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
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
              validate: validateRoleSelection,
              properties: {
                enumValue: Protobuf.Config.Config_DeviceConfig_Role,
                formatEnumName: true,
              },
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
              name: "disableTripleClick",
              label: "Disable Triple Click",
              description: "Disable triple click",
            },
            {
              type: "text",
              name: "tzdef",
              label: "POSIX Timezone",
              description: "The POSIX timezone string for the device",
              properties: {
                fieldLength: {
                  max: 64,
                  currentValueLength: config.device?.tzdef?.length,
                  showCharacterCount: true,
                },
              },
            },
            {
              type: "toggle",
              name: "ledHeartbeatDisabled",
              label: "LED Heartbeat Disabled",
              description: "Disable default blinking LED",
            },
          ],
        },
      ]}
    />
  );
};
