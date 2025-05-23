import type { DeviceValidation } from "@app/validation/config/device.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useUnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog.ts";
import { useTranslation } from "react-i18next";

export const Device = () => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();
  const { validateRoleSelection } = useUnsafeRolesDialog();

  const onSubmit = (data: DeviceValidation) => {
    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "device",
          value: data,
        },
      }),
    );
  };
  return (
    <DynamicForm<DeviceValidation>
      onSubmit={onSubmit}
      defaultValues={config.device}
      fieldGroups={[
        {
          label: t("config_device_groupLabel_deviceSettings"),
          description: t("config_device_groupDescription_deviceSettings"),
          fields: [
            {
              type: "select",
              name: "role",
              label: t("config_device_fieldLabel_role"),
              description: t("config_device_fieldDescription_role"),
              validate: validateRoleSelection,
              properties: {
                enumValue: Protobuf.Config.Config_DeviceConfig_Role,
                formatEnumName: true,
              },
            },
            {
              type: "number",
              name: "buttonGpio",
              label: t("config_device_fieldLabel_buttonPin"),
              description: t("config_device_fieldDescription_buttonPin"),
            },
            {
              type: "number",
              name: "buzzerGpio",
              label: t("config_device_fieldLabel_buzzerPin"),
              description: t("config_device_fieldDescription_buzzerPin"),
            },
            {
              type: "select",
              name: "rebroadcastMode",
              label: t("config_device_fieldLabel_rebroadcastMode"),
              description: t("config_device_fieldDescription_rebroadcastMode"),
              properties: {
                enumValue: Protobuf.Config.Config_DeviceConfig_RebroadcastMode,
                formatEnumName: true,
              },
            },
            {
              type: "number",
              name: "nodeInfoBroadcastSecs",
              label: t("config_device_fieldLabel_nodeInfoBroadcastInterval"),
              description: t(
                "config_device_fieldDescription_nodeInfoBroadcastInterval",
              ),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "toggle",
              name: "doubleTapAsButtonPress",
              label: t("config_device_fieldLabel_doubleTapAsButtonPress"),
              description: t(
                "config_device_fieldDescription_doubleTapAsButtonPress",
              ),
            },
            {
              type: "toggle",
              name: "disableTripleClick",
              label: t("config_device_fieldLabel_disableTripleClick"),
              description: t(
                "config_device_fieldDescription_disableTripleClick",
              ),
            },
            {
              type: "text",
              name: "tzdef",
              label: t("config_device_fieldLabel_posixTimezone"),
              description: t("config_device_fieldDescription_posixTimezone"),
              properties: {
                fieldLength: {
                  max: 64,
                  currentValueLength: config.device?.tzdef?.length,
                  showCharacterCount: true,
                },
              },
            },
            {
              type: "toggle",
              name: "ledHeartbeatDisabled",
              label: t("config_device_fieldLabel_ledHeartbeatDisabled"),
              description: t(
                "config_device_fieldDescription_ledHeartbeatDisabled",
              ),
            },
          ],
        },
      ]}
    />
  );
};
