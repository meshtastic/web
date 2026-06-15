import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import { type DeviceValidation, DeviceValidationSchema } from "@app/validation/config/device.ts";
import { useUnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface DeviceConfigProps {
  onFormInit: DynamicFormFormInit<DeviceValidation>;
}

const EMPTY_RADIO_SIGNAL = {
  value: {} as { device?: Protobuf.Config.Config_DeviceConfig },
  peek: () => ({}) as { device?: Protobuf.Config.Config_DeviceConfig },
  subscribe: () => () => {},
} as const;

export const Device = ({ onFormInit }: DeviceConfigProps) => {
  useWaitForConfig({ configCase: "device" });

  const { config, getEffectiveConfig } = useDevice();
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO_SIGNAL);
  const effective =
    radio.device ??
    (getEffectiveConfig("device") as Protobuf.Config.Config_DeviceConfig | undefined);

  const { t } = useTranslation("config");
  const { validateRoleSelection } = useUnsafeRolesDialog();

  const onSubmit = (data: DeviceValidation) => {
    if (!editor) return;
    editor.setRadioSection("device", data as unknown as Protobuf.Config.Config_DeviceConfig);
  };

  return (
    <DynamicForm<DeviceValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DeviceValidationSchema}
      defaultValues={config.device}
      values={effective}
      fieldGroups={[
        {
          label: t("device.options.label"),
          description: t("device.options.description"),
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
              properties: { suffix: t("unit.second.plural") },
            },
          ],
        },
        {
          label: t("device.hardware.label"),
          description: t("device.hardware.description"),
          fields: [
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
              type: "toggle",
              name: "ledHeartbeatDisabled",
              label: t("device.ledHeartbeatDisabled.label"),
              description: t("device.ledHeartbeatDisabled.description"),
            },
          ],
        },
        {
          label: t("device.timeZone.label"),
          description: t("device.timeZone.description"),
          fields: [
            {
              type: "text",
              name: "tzdef",
              label: t("device.posixTimezone.label"),
              description: t("device.posixTimezone.description"),
              properties: {
                fieldLength: {
                  max: 64,
                  currentValueLength: effective?.tzdef?.length,
                  showCharacterCount: true,
                },
              },
            },
          ],
        },
        {
          label: t("device.gpio.label"),
          description: t("device.gpio.description"),
          fields: [
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
          ],
        },
      ]}
    />
  );
};
