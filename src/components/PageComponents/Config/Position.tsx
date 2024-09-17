import type { PositionValidation } from "@app/validation/config/position.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const Position = (): JSX.Element => {
  const { config, nodes, hardware, setWorkingConfig } = useDevice();

  const onSubmit = (data: PositionValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "position",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<PositionValidation>
      onSubmit={onSubmit}
      defaultValues={config.position}
      fieldGroups={[
        {
          label: "Position Settings",
          description: "Settings for the position module",
          fields: [
            {
              type: "toggle",
              name: "positionBroadcastSmartEnabled",
              label: "Enable Smart Position",
              description:
                "Only send position when there has been a meaningful change in location",
            },
            {
              type: "select",
              name: "gpsMode",
              label: "GPS Mode",
              description:
                "Configure whether device GPS is Enabled, Disabled, or Not Present",
              properties: {
                enumValue: Protobuf.Config.Config_PositionConfig_GpsMode,
              },
            },
            {
              type: "toggle",
              name: "fixedPosition",
              label: "Fixed Position",
              description:
                "Don't report GPS position, but a manually-specified one",
            },
            {
              type: "multiSelect",
              name: "positionFlags",
              label: "Position Flags",
              description: "Configuration options for Position messages",
              properties: {
                enumValue: Protobuf.Config.Config_PositionConfig_PositionFlags,
              },
            },
            {
              type: "number",
              name: "rxGpio",
              label: "Receive Pin",
              description: "GPS module RX pin override",
            },
            {
              type: "number",
              name: "txGpio",
              label: "Transmit Pin",
              description: "GPS module TX pin override",
            },
            {
              type: "number",
              name: "gpsEnGpio",
              label: "Enable Pin",
              description: "GPS module enable pin override",
            },
            {
              type: "select",
              name: "channelPrecision",
              label: "Channel Precision",
              description:
                "GPS channel precision",
              properties: {
                enumValue:
                  config.display?.units === 0
                    ? {
                        "Within 23 km": 10,
                        "Within 12 km": 11,
                        "Within 5.8 km": 12,
                        "Within 2.9 km": 13,
                        "Within 1.5 km": 14,
                        "Within 700 m": 15,
                        "Within 350 m": 16,
                        "Within 200 m": 17,
                        "Within 90 m": 18,
                        "Within 50 m": 19,
                      }
                    : {
                        "Within 15 miles": 10,
                        "Within 7.3 miles": 11,
                        "Within 3.6 miles": 12,
                        "Within 1.8 miles": 13,
                        "Within 0.9 miles": 14,
                        "Within 0.5 miles": 15,
                        "Within 0.2 miles": 16,
                        "Within 600 feet": 17,
                        "Within 300 feet": 18,
                        "Within 150 feet": 19,
                      },
              },
            },
          ],
        },
        {
          label: "Intervals",
          description: "How often to send position updates",
          fields: [
            {
              type: "number",
              name: "positionBroadcastSecs",
              label: "Broadcast Interval",
              description: "How often your position is sent out over the mesh",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "gpsUpdateInterval",
              label: "GPS Update Interval",
              description: "How often a GPS fix should be acquired",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "broadcastSmartMinimumDistance",
              label: "Smart Position Minimum Distance",
              description:
                "Minimum distance (in meters) that must be traveled before a position update is sent",
              disabledBy: [
                {
                  fieldName: "positionBroadcastSmartEnabled",
                },
              ],
            },
            {
              type: "number",
              name: "broadcastSmartMinimumIntervalSecs",
              label: "Smart Position Minimum Interval",
              description:
                "Minimum interval (in seconds) that must pass before a position update is sent",
              disabledBy: [
                {
                  fieldName: "positionBroadcastSmartEnabled",
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};
