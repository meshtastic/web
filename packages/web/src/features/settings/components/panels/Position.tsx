import { Protobuf } from "@meshtastic/core";
import type { FlagName } from "@shared/hooks/usePositionFlags";
import { useDevice } from "@state/index.ts";
import { useTranslation } from "react-i18next";
import { usePositionForm } from "../../hooks/index.ts";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading.tsx";
import type { PositionValidation } from "../../validation/config/position.ts";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields.tsx";

export const Position = () => {
  const { t } = useTranslation("config");
  const { getEffectiveConfig } = useDevice();
  const {
    form,
    isReady,
    isDisabledByField,
    activeFlags,
    toggleFlag,
    getAllFlags,
  } = usePositionForm();

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const displayUnits = getEffectiveConfig("display")?.units;

  const fieldGroups: FieldGroup<PositionValidation>[] = [
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
              selector: Protobuf.Config.Config_PositionConfig_GpsMode.ENABLED,
            },
          ],
        },
        {
          type: "number",
          name: "latitude",
          label: t("position.fixedPosition.latitude.label"),
          description: `${t("position.fixedPosition.latitude.description")} (Max 7 decimal precision)`,
          properties: {
            step: 0.0000001,
            suffix: "Degrees",
          },
          disabledBy: [{ fieldName: "fixedPosition" }],
        },
        {
          type: "number",
          name: "longitude",
          label: t("position.fixedPosition.longitude.label"),
          description: `${t("position.fixedPosition.longitude.description")} (Max 7 decimal precision)`,
          properties: {
            step: 0.0000001,
            suffix: "Degrees",
          },
          disabledBy: [{ fieldName: "fixedPosition" }],
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
          disabledBy: [{ fieldName: "fixedPosition" }],
        },
        {
          type: "multiSelect",
          name: "positionFlags",
          label: t("position.positionFlags.label"),
          description: t("position.positionFlags.description"),
          properties: {
            enumValue: getAllFlags(),
            value: activeFlags,
            isChecked: (name: string) =>
              activeFlags?.includes(name as FlagName) ?? false,
            onValueChange: (name: string) => toggleFlag(name as FlagName),
            placeholder: t("position.flags.placeholder"),
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
          disabledBy: [{ fieldName: "positionBroadcastSmartEnabled" }],
        },
        {
          type: "number",
          name: "broadcastSmartMinimumIntervalSecs",
          label: t("position.smartPositionMinInterval.label"),
          description: t("position.smartPositionMinInterval.description"),
          disabledBy: [{ fieldName: "positionBroadcastSmartEnabled" }],
        },
      ],
    },
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
