import type { DeviceValidation } from "@app/validation/config/device.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useUnsafeRoles } from "@components/Dialog/UnsafeRolesDialog/useUnsafeRoles.ts";

export const Device = () => {

  const { config, setWorkingConfig, setDialogOpen } = useDevice();
  const { agreedToUnSafeRoles } = useUnsafeRoles();

  const onSubmit = (data: DeviceValidation) => {
    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "device",
          value: data
        },
      }),
    );
  };

  // deno-lint-ignore require-await
  async function handleOnBeforeChange(newValue: string) {
    if (newValue === "ROUTER" || newValue === 'REPEATER') {
      // Open the dialog to confirm the user wants to select an unsafe role
      setDialogOpen('unsafeRoles', true);

      // We checked the persisted value of agreedToUnSafeRoles in localStorage to see if the user has agreed to unsafe roles
      if (agreedToUnSafeRoles) {
        return newValue;
      } else {
        // If the user has not agreed to unsafe roles, we return false to prevent the role from being set
        return false;
      }

    }
    return newValue;
  }

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
              onBeforeChange: handleOnBeforeChange,
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