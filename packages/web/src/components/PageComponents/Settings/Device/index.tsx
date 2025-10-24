import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type DeviceValidation,
  DeviceValidationSchema,
} from "@app/validation/config/device.ts";
import { useUnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface DeviceConfigProps {
  onFormInit: DynamicFormFormInit<DeviceValidation>;
}
export const Device = ({ onFormInit }: DeviceConfigProps) => {
  useWaitForConfig({ configCase: "device" });

  const { config, setChange, getEffectiveConfig, removeChange } = useDevice();
  const { t } = useTranslation("config");
  const { validateRoleSelection } = useUnsafeRolesDialog();

  const onSubmit = (data: DeviceValidation) => {
    if (deepCompareConfig(config.device, data, true)) {
      removeChange({ type: "config", variant: "device" });
      return;
    }

    setChange({ type: "config", variant: "device" }, data, config.device);
  };

  return (
    <DynamicForm<DeviceValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DeviceValidationSchema}
      defaultValues={config.device}
      values={getEffectiveConfig("device")}
      fieldGroups={[
        {
          label: t("device.title"),
          description: t("device.description"),
          fields: [
            {
              type: "select",
              name: "role",
              label: t("device.role.label"),
              description: t("device.role.description"),
              validate: validateRoleSelection,
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
                  currentValueLength:
                    getEffectiveConfig("device")?.tzdef?.length,
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
      ]}
    />
  );
};
