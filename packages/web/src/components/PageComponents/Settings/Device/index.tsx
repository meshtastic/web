import type { DeviceValidation } from "@app/validation/config/device";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@components/Form/ConfigFormFields";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useDeviceForm } from "@pages/Settings/hooks";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { useTranslation } from "react-i18next";

export const Device = () => {
  const { t } = useTranslation("config");
  const { getEffectiveConfig } = useDevice();
  const { form, isReady, isDisabledByField } = useDeviceForm();

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<DeviceValidation>[] = [
    {
      label: t("device.title"),
      description: t("device.description"),
      fields: [
        {
          type: "select",
          name: "role",
          label: t("device.role.label"),
          description: t("device.role.description"),
          properties: {
            enumValue: Protobuf.Config.Config_DeviceConfig_Role,
            formatEnumName: true,
          },
        },
        {
          type: "number",
          name: "buttonGpio",
          label: t("device.buttonPin.label"),
          description: t("device.buttonPin.description"),
        },
        {
          type: "number",
          name: "buzzerGpio",
          label: t("device.buzzerPin.label"),
          description: t("device.buzzerPin.description"),
        },
        {
          type: "select",
          name: "rebroadcastMode",
          label: t("device.rebroadcastMode.label"),
          description: t("device.rebroadcastMode.description"),
          properties: {
            enumValue: Protobuf.Config.Config_DeviceConfig_RebroadcastMode,
            formatEnumName: true,
          },
        },
        {
          type: "number",
          name: "nodeInfoBroadcastSecs",
          label: t("device.nodeInfoBroadcastInterval.label"),
          description: t("device.nodeInfoBroadcastInterval.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
        },
        {
          type: "toggle",
          name: "doubleTapAsButtonPress",
          label: t("device.doubleTapAsButtonPress.label"),
          description: t("device.doubleTapAsButtonPress.description"),
        },
        {
          type: "toggle",
          name: "disableTripleClick",
          label: t("device.disableTripleClick.label"),
          description: t("device.disableTripleClick.description"),
        },
        {
          type: "text",
          name: "tzdef",
          label: t("device.posixTimezone.label"),
          description: t("device.posixTimezone.description"),
          properties: {
            fieldLength: {
              max: 64,
              currentValueLength: getEffectiveConfig("device")?.tzdef?.length,
              showCharacterCount: true,
            },
          },
        },
        {
          type: "toggle",
          name: "ledHeartbeatDisabled",
          label: t("device.ledHeartbeatDisabled.label"),
          description: t("device.ledHeartbeatDisabled.description"),
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
