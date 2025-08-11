import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type BluetoothValidation,
  BluetoothValidationSchema,
} from "@app/validation/config/bluetooth.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface BluetoothConfigProps {
  onFormInit: DynamicFormFormInit<BluetoothValidation>;
}
export const Bluetooth = ({ onFormInit }: BluetoothConfigProps) => {
  useWaitForConfig({ configCase: "bluetooth" });

  const { config, setWorkingConfig, getEffectiveConfig, removeWorkingConfig } =
    useDevice();
  const { t } = useTranslation("deviceConfig");

  const onSubmit = (data: BluetoothValidation) => {
    if (deepCompareConfig(config.bluetooth, data, true)) {
      removeWorkingConfig("bluetooth");
      return;
    }

    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "bluetooth",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<BluetoothValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={BluetoothValidationSchema}
      formId="Config_BluetoothConfig"
      defaultValues={config.bluetooth}
      values={getEffectiveConfig("bluetooth")}
      fieldGroups={[
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
      ]}
    />
  );
};
