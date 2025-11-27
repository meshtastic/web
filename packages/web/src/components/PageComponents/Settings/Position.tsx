import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type PositionValidation,
  PositionValidationSchema,
} from "@app/validation/config/position.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  type FlagName,
  usePositionFlags,
} from "@core/hooks/usePositionFlags.ts";
import { useDevice, useNodeDB } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface PositionConfigProps {
  onFormInit: DynamicFormFormInit<PositionValidation>;
}
export const Position = ({ onFormInit }: PositionConfigProps) => {
  useWaitForConfig({ configCase: "position" });

  const {
    setChange,
    config,
    getEffectiveConfig,
    removeChange,
    queueAdminMessage,
  } = useDevice();
  const { getMyNode } = useNodeDB();
  const { flagsValue, activeFlags, toggleFlag, getAllFlags } = usePositionFlags(
    getEffectiveConfig("position")?.positionFlags ?? 0,
  );
  const { t } = useTranslation("config");

  const myNode = getMyNode();
  const currentPosition = myNode?.position;

  const effectiveConfig = getEffectiveConfig("position");
  const displayUnits = getEffectiveConfig("display")?.units;

  const formValues = useMemo(() => {
    return {
      ...config.position,
      ...effectiveConfig,
      // Include current position coordinates if available
      latitude: currentPosition?.latitudeI
        ? currentPosition.latitudeI / 1e7
        : undefined,
      longitude: currentPosition?.longitudeI
        ? currentPosition.longitudeI / 1e7
        : undefined,
      altitude: currentPosition?.altitude ?? 0,
    } as PositionValidation;
  }, [config.position, effectiveConfig, currentPosition]);

  const onSubmit = (data: PositionValidation) => {
    // Exclude position coordinates from config payload (they're handled via admin message)
    const {
      latitude: _latitude,
      longitude: _longitude,
      altitude: _altitude,
      ...configData
    } = data;
    const payload = { ...configData, positionFlags: flagsValue };

    // Save config first
    let configResult: ReturnType<typeof setChange> | undefined;
    if (deepCompareConfig(config.position, payload, true)) {
      removeChange({ type: "config", variant: "position" });
      configResult = undefined;
    } else {
      configResult = setChange(
        { type: "config", variant: "position" },
        payload,
        config.position,
      );
    }

    // Then handle position coordinates via admin message if fixedPosition is enabled
    if (
      data.fixedPosition &&
      data.latitude !== undefined &&
      data.longitude !== undefined
    ) {
      const message = create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "setFixedPosition",
          value: create(Protobuf.Mesh.PositionSchema, {
            latitudeI: Math.round(data.latitude * 1e7),
            longitudeI: Math.round(data.longitude * 1e7),
            altitude: data.altitude || 0,
            time: Math.floor(Date.now() / 1000),
          }),
        },
      });

      queueAdminMessage(message);
    }

    return configResult;
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
      values={formValues}
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
              disabledBy: [
                {
                  fieldName: "gpsMode",
                  selector:
                    Protobuf.Config.Config_PositionConfig_GpsMode.ENABLED,
                },
              ],
            },
            // Position coordinate fields (only shown when fixedPosition is enabled)
            {
              type: "number",
              name: "latitude",
              label: t("position.fixedPosition.latitude.label"),
              description: `${t("position.fixedPosition.latitude.description")} (Max 7 decimal precision)`,
              properties: {
                step: 0.0000001,
                suffix: "Degrees",
                fieldLength: {
                  max: 10,
                },
              },
              disabledBy: [
                {
                  fieldName: "fixedPosition",
                },
              ],
            },
            {
              type: "number",
              name: "longitude",
              label: t("position.fixedPosition.longitude.label"),
              description: `${t("position.fixedPosition.longitude.description")} (Max 7 decimal precision)`,
              properties: {
                step: 0.0000001,
                suffix: "Degrees",
                fieldLength: {
                  max: 10,
                },
              },
              disabledBy: [
                {
                  fieldName: "fixedPosition",
                },
              ],
            },
            {
              type: "number",
              name: "altitude",
              label: t("position.fixedPosition.altitude.label"),
              description: t("position.fixedPosition.altitude.description", {
                unit:
                  displayUnits ===
                  Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL
                    ? "Feet"
                    : "Meters",
              }),
              properties: {
                step: 0.0000001,
                suffix:
                  displayUnits ===
                  Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL
                    ? "Feet"
                    : "Meters",
              },
              disabledBy: [
                {
                  fieldName: "fixedPosition",
                },
              ],
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
