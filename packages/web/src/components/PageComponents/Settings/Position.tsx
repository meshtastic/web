import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type PositionValidation,
  PositionValidationSchema,
} from "@app/validation/config/position.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  type FlagName,
  usePositionFlags,
} from "@core/hooks/usePositionFlags.ts";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface PositionConfigProps {
  onFormInit: DynamicFormFormInit<PositionValidation>;
}
export const Position = ({ onFormInit }: PositionConfigProps) => {
  useWaitForConfig({ configCase: "position" });

  const { setChange, config, getEffectiveConfig, removeChange } = useDevice();
  const { flagsValue, activeFlags, toggleFlag, getAllFlags } = usePositionFlags(
    getEffectiveConfig("position")?.positionFlags ?? 0,
  );
  const { t } = useTranslation("config");

  const onSubmit = (data: PositionValidation) => {
    const payload = { ...data, positionFlags: flagsValue };
    if (deepCompareConfig(config.position, payload, true)) {
      removeChange({ type: "config", variant: "position" });
      return;
    }

    return setChange(
      { type: "config", variant: "position" },
      payload,
      config.position,
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
      onFormInit={onFormInit}
      validationSchema={PositionValidationSchema}
      defaultValues={config.position}
      values={getEffectiveConfig("position")}
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
