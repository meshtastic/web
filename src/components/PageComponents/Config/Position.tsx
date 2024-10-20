import type { PositionValidation } from "@app/validation/config/position.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const Position = (): JSX.Element => {
  const { config, nodes, hardware, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: PositionValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "position",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<PositionValidation>
      onSubmit={onSubmit}
      defaultValues={config.position}
      fieldGroups={[
        {
          label: t("Position Settings"),
          description: t("Settings for the position module"),
          fields: [
            {
              type: "toggle",
              name: "positionBroadcastSmartEnabled",
              label: t("Enable Smart Position"),
              description: t(
                "Only send position when there has been a meaningful change in location"
              ),
            },
            {
              type: "select",
              name: "gpsMode",
              label: t("GPS Mode"),
              description: t(
                "Configure whether device GPS is Enabled, Disabled, or Not Present"
              ),
              properties: {
                enumValue: Protobuf.Config.Config_PositionConfig_GpsMode,
              },
            },
            {
              type: "toggle",
              name: "fixedPosition",
              label: t("Fixed Position"),
              description: t(
                "Don't report GPS position, but a manually-specified one"
              ),
            },
            {
              type: "multiSelect",
              name: "positionFlags",
              label: t("Position Flags"),
              description: t("Configuration options for Position messages"),
              properties: {
                enumValue: Protobuf.Config.Config_PositionConfig_PositionFlags,
              },
            },
            {
              type: "number",
              name: "rxGpio",
              label: t("Receive Pin"),
              description: t("GPS module RX pin override"),
            },
            {
              type: "number",
              name: "txGpio",
              label: t("Transmit Pin"),
              description: t("GPS module TX pin override"),
            },
            {
              type: "number",
              name: "gpsEnGpio",
              label: t("Enable Pin"),
              description: t("GPS module enable pin override"),
            },
          ],
        },
        {
          label: t("Intervals"),
          description: t("How often to send position updates"),
          fields: [
            {
              type: "number",
              name: "positionBroadcastSecs",
              label: t("Broadcast Interval"),
              description: t("How often your position is sent out over the mesh"),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "gpsUpdateInterval",
              label: t("GPS Update Interval"),
              description: t("How often a GPS fix should be acquired"),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "number",
              name: "broadcastSmartMinimumDistance",
              label: t("Smart Position Minimum Distance"),
              description:
                t("Minimum distance (in meters) that must be traveled before a position update is sent"),
              disabledBy: [
                {
                  fieldName: "positionBroadcastSmartEnabled",
                },
              ],
            },
            {
              type: "number",
              name: "broadcastSmartMinimumIntervalSecs",
              label: t("Smart Position Minimum Interval"),
              description:
                t("Minimum interval (in seconds) that must pass before a position update is sent"),
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
