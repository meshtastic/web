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
import { useTranslation } from "react-i18next";

export const Position = () => {
  const { config, setWorkingConfig } = useDevice();
  const { flagsValue, activeFlags, toggleFlag, getAllFlags } = usePositionFlags(
    config?.position?.positionFlags ?? 0,
  );
  const { t } = useTranslation("deviceConfig");

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
          label: t("position.title"),
          description: t("position.description"),
          fields: [
            {
              type: "toggle",
              name: "positionBroadcastSmartEnabled",
              label: t("position.smartPositionEnabled.label"),
              description: t("position.smartPositionEnabled.description"),
            },
            {
              type: "select",
              name: "gpsMode",
              label: t("position.gpsMode.label"),
              description: t("position.gpsMode.description"),
              properties: {
                enumValue: Protobuf.Config.Config_PositionConfig_GpsMode,
              },
            },
            {
              type: "toggle",
              name: "fixedPosition",
              label: t("position.fixedPosition.label"),
              description: t("position.fixedPosition.description"),
            },
            {
              type: "multiSelect",
              name: "positionFlags",
              value: activeFlags,
              isChecked: (name: string) =>
                activeFlags?.includes(name as FlagName) ?? false,
              onValueChange: onPositonFlagChange,
              label: t("position.positionFlags.label"),
              placeholder: t("position.flags.placeholder"),
              description: t("position.positionFlags.description"),
              properties: {
                enumValue: getAllFlags(),
              },
            },
            {
              type: "number",
              name: "rxGpio",
              label: t("position.receivePin.label"),
              description: t("position.receivePin.description"),
            },
            {
              type: "number",
              name: "txGpio",
              label: t("position.transmitPin.label"),
              description: t("position.transmitPin.description"),
            },
            {
              type: "number",
              name: "gpsEnGpio",
              label: t("position.enablePin.label"),
              description: t("position.enablePin.description"),
            },
          ],
        },
        {
          label: t("position.intervalsSettings.label"),
          description: t("position.intervalsSettings.description"),
          fields: [
            {
              type: "number",
              name: "positionBroadcastSecs",
              label: t("position.broadcastInterval.label"),
              description: t("position.broadcastInterval.description"),
              properties: {
                suffix: t("unit.second.plural"),
              },
            },
            {
              type: "number",
              name: "gpsUpdateInterval",
              label: t("position.gpsUpdateInterval.label"),
              description: t("position.gpsUpdateInterval.description"),
              properties: {
                suffix: t("unit.second.plural"),
              },
            },
            {
              type: "number",
              name: "broadcastSmartMinimumDistance",
              label: t("position.smartPositionMinDistance.label"),
              description: t("position.smartPositionMinDistance.description"),
              disabledBy: [
                {
                  fieldName: "positionBroadcastSmartEnabled",
                },
              ],
            },
            {
              type: "number",
              name: "broadcastSmartMinimumIntervalSecs",
              label: t("position.smartPositionMinInterval.label"),
              description: t("position.smartPositionMinInterval.description"),
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
