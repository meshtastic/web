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
import {
  createFieldMetadata,
  useFieldRegistry,
} from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface DeviceConfigProps {
  onFormInit: DynamicFormFormInit<DeviceValidation>;
}
export const Device = ({ onFormInit }: DeviceConfigProps) => {
  useWaitForConfig({ configCase: "device" });

  const { config, getEffectiveConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("config");
  const { validateRoleSelection } = useUnsafeRolesDialog();

  const section = { type: "config", variant: "device" } as const;

  const fieldGroups = [
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

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  const onSubmit = (data: DeviceValidation) => {
    // Track individual field changes
    const originalData = config.device;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof DeviceValidation>).forEach(
      (fieldName) => {
        const newValue = data[fieldName];
        const oldValue = originalData[fieldName];

        if (newValue !== oldValue) {
          trackChange(section, fieldName as string, newValue, oldValue);
        } else {
          removeFieldChange(section, fieldName as string);
        }
      },
    );
  };

  return (
    <DynamicForm<DeviceValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DeviceValidationSchema}
      defaultValues={config.device}
      values={getEffectiveConfig("device")}
      fieldGroups={fieldGroups}
    />
  );
};
