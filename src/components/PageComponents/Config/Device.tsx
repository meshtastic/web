import type { DeviceValidation } from "@app/validation/config/device.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";
import { useTranslation } from "react-i18next";

export const Device = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: DeviceValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "device",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<DeviceValidation>
      onSubmit={onSubmit}
      defaultValues={config.device}
      fieldGroups={[
        {
          label: t("Device Settings"),
          description: t("Settings for the device"),
          fields: [
            {
              type: "select",
              name: "role",
              label: t("Role"),
              description: t("What role the device performs on the mesh"),
              properties: {
                enumValue: {
                  Client: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
                  "Client Mute":
                    Protobuf.Config.Config_DeviceConfig_Role.CLIENT_MUTE,
                  Router: Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
                  Repeater: Protobuf.Config.Config_DeviceConfig_Role.REPEATER,
                  Tracker: Protobuf.Config.Config_DeviceConfig_Role.TRACKER,
                  Sensor: Protobuf.Config.Config_DeviceConfig_Role.SENSOR,
                  TAK: Protobuf.Config.Config_DeviceConfig_Role.TAK,
                  "Client Hidden":
                    Protobuf.Config.Config_DeviceConfig_Role.CLIENT_HIDDEN,
                  "Lost and Found":
                    Protobuf.Config.Config_DeviceConfig_Role.LOST_AND_FOUND,
                  "TAK Tracker":
                    Protobuf.Config.Config_DeviceConfig_Role.SENSOR,
                },
                formatEnumName: true,
              },
            },
            {
              type: "number",
              name: "buttonGpio",
              label: t("Button Pin"),
              description: t("Button pin override"),
            },
            {
              type: "number",
              name: "buzzerGpio",
              label: t("Buzzer Pin"),
              description: t("Buzzer pin override"),
            },
            {
              type: "select",
              name: "rebroadcastMode",
              label: t("Rebroadcast Mode"),
              description: t("How to handle rebroadcasting"),
              properties: {
                enumValue: Protobuf.Config.Config_DeviceConfig_RebroadcastMode,
                formatEnumName: true,
              },
            },
            {
              type: "number",
              name: "nodeInfoBroadcastSecs",
              label: t("Node Info Broadcast Interval"),
              description: t("How often to broadcast node info"),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "toggle",
              name: "doubleTapAsButtonPress",
              label: t("Double Tap as Button Press"),
              description: t("Treat double tap as button press"),
            },
            {
              type: "toggle",
              name: "disableTripleClick",
              label: t("Disable Triple Click"),
              description: t("Disable Triple Click"),
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
