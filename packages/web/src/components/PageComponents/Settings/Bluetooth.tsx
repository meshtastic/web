import { useConfigForm } from "@app/pages/Settings/hooks/useConfigForm";
import {
  type BluetoothValidation,
  BluetoothValidationSchema,
} from "@app/validation/config/bluetooth";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@components/Form/ConfigFormFields";
import { Protobuf } from "@meshtastic/core";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { useTranslation } from "react-i18next";

export const Bluetooth = () => {
  const { t } = useTranslation("config");
  const { form, isReady, isDisabledByField } =
    useConfigForm<BluetoothValidation>({
      configType: "bluetooth",
      schema: BluetoothValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<BluetoothValidation>[] = [
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
          disabledBy: [{ fieldName: "enabled" }],
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

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
