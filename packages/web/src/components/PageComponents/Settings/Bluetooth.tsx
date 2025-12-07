import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type BluetoothValidation,
  BluetoothValidationSchema,
} from "@app/validation/config/bluetooth.ts";
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

interface BluetoothConfigProps {
  onFormInit: DynamicFormFormInit<BluetoothValidation>;
}
export const Bluetooth = ({ onFormInit }: BluetoothConfigProps) => {
  useWaitForConfig({ configCase: "bluetooth" });

  const { config, getEffectiveConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("config");

  const section = { type: "config", variant: "bluetooth" } as const;

  const fieldGroups = [
    {
      label: t("bluetooth.title"),
      description: t("bluetooth.description"),
      notes: t("bluetooth.note"),
      fields: [
        {
          type: "toggle",
          name: "enabled",
          label: t("bluetooth.enabled.label"),
          description: t("bluetooth.enabled.description"),
        },
        {
          type: "select",
          name: "mode",
          label: t("bluetooth.pairingMode.label"),
          description: t("bluetooth.pairingMode.description"),
          disabledBy: [
            {
              fieldName: "enabled",
            },
          ],
          properties: {
            enumValue: Protobuf.Config.Config_BluetoothConfig_PairingMode,
            formatEnumName: true,
          },
        },
        {
          type: "number",
          name: "fixedPin",
          label: t("bluetooth.pin.label"),
          description: t("bluetooth.pin.description"),
        },
      ],
    },
  ];

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  const onSubmit = (data: BluetoothValidation) => {
    // Track individual field changes
    const originalData = config.bluetooth;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof BluetoothValidation>).forEach(
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
    <DynamicForm<BluetoothValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={BluetoothValidationSchema}
      defaultValues={config.bluetooth}
      values={getEffectiveConfig("bluetooth")}
      fieldGroups={fieldGroups}
    />
  );
};
