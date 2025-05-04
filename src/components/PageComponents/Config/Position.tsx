import {
  type FlagName,
  usePositionFlags,
} from "@core/hooks/usePositionFlags.ts";
import type { PositionValidation } from "@app/validation/config/position.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useCallback } from "react";

export const Position = () => {
  const { config, setWorkingConfig } = useDevice();
  const { flagsValue, activeFlags, toggleFlag, getAllFlags } = usePositionFlags(
    config?.position?.positionFlags ?? 0,
  );

  const onSubmit = (data: PositionValidation) => {
    return setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "position",
          value: { ...data, positionFlags: flagsValue },
        },
      }),
    );
  };

  const onPositonFlagChange = useCallback(
    (name: string) => {
      return toggleFlag(name as FlagName);
    },
    [toggleFlag],
  );

  return (
    <DynamicForm<PositionValidation>
      onSubmit={(data) => {
        data.positionFlags = flagsValue;
        return onSubmit(data);
      }}
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
              value: activeFlags,
              isChecked: (name: string) =>
                activeFlags?.includes(name as FlagName) ?? false,
              onValueChange: onPositonFlagChange,
              label: "Position Flags",
              placeholder: "Select position flags...",
              description:
                "Optional fields to include when assembling position messages. The more fields are selected, the larger the message will be leading to longer airtime usage and a higher risk of packet loss.",
              properties: {
                enumValue: getAllFlags(),
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
