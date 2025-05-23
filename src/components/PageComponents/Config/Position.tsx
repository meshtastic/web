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
  const { t } = useTranslation();

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
          label: t("config_position_groupLabel_positionSettings"),
          description: t("config_position_groupDescription_positionSettings"),
          fields: [
            {
              type: "toggle",
              name: "positionBroadcastSmartEnabled",
              label: t("config_position_fieldLabel_smartPositionEnabled"),
              description: t(
                "config_position_fieldDescription_smartPositionEnabled",
              ),
            },
            {
              type: "select",
              name: "gpsMode",
              label: t("config_position_fieldLabel_gpsMode"),
              description: t("config_position_fieldDescription_gpsMode"),
              properties: {
                enumValue: Protobuf.Config.Config_PositionConfig_GpsMode,
              },
            },
            {
              type: "toggle",
              name: "fixedPosition",
              label: t("config_position_fieldLabel_fixedPosition"),
              description: t("config_position_fieldDescription_fixedPosition"),
            },
            {
              type: "multiSelect",
              name: "positionFlags",
              value: activeFlags,
              isChecked: (name: string) =>
                activeFlags?.includes(name as FlagName) ?? false,
              onValueChange: onPositonFlagChange,
              label: t("config_position_fieldLabel_positionFlags"),
              placeholder: t(
                "config_position_fieldPlaceholder_selectPositionFlags",
              ),
              description: t("config_position_fieldDescription_positionFlags"),
              properties: {
                enumValue: getAllFlags(),
              },
            },
            {
              type: "number",
              name: "rxGpio",
              label: t("config_position_fieldLabel_receivePin"),
              description: t("config_position_fieldDescription_receivePin"),
            },
            {
              type: "number",
              name: "txGpio",
              label: t("config_position_fieldLabel_transmitPin"),
              description: t("config_position_fieldDescription_transmitPin"),
            },
            {
              type: "number",
              name: "gpsEnGpio",
              label: t("config_position_fieldLabel_enablePin"),
              description: t("config_position_fieldDescription_enablePin"),
            },
          ],
        },
        {
          label: t("config_position_groupLabel_intervals"),
          description: t("config_position_groupDescription_intervals"),
          fields: [
            {
              type: "number",
              name: "positionBroadcastSecs",
              label: t("config_position_fieldLabel_broadcastInterval"),
              description: t(
                "config_position_fieldDescription_broadcastInterval",
              ),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "number",
              name: "gpsUpdateInterval",
              label: t("config_position_fieldLabel_gpsUpdateInterval"),
              description: t(
                "config_position_fieldDescription_gpsUpdateInterval",
              ),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "number",
              name: "broadcastSmartMinimumDistance",
              label: t("config_position_fieldLabel_smartPositionMinDistance"),
              description: t(
                "config_position_fieldDescription_smartPositionMinDistance",
              ),
              disabledBy: [
                {
                  fieldName: "positionBroadcastSmartEnabled",
                },
              ],
            },
            {
              type: "number",
              name: "broadcastSmartMinimumIntervalSecs",
              label: t("config_position_fieldLabel_smartPositionMinInterval"),
              description: t(
                "config_position_fieldDescription_smartPositionMinInterval",
              ),
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
