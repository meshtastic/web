import type { BluetoothValidation } from "@app/validation/config/bluetooth.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Bluetooth = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();
  const [bluetoothValidationText, setBluetoothValidationText] = useState<string>();

  const bluetoothPinChangeEvent = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.value[0] === "0")
    {
      setBluetoothValidationText("Bluetooth Pin cannot start with 0.");
    }
    else
    {
      setBluetoothValidationText("");
    }
  }

  const onSubmit = (data: BluetoothValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "bluetooth",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<BluetoothValidation>
      onSubmit={onSubmit}
      defaultValues={config.bluetooth}
      fieldGroups={[
        {
          label: t("Bluetooth Settings"),
          description: t("Settings for the Bluetooth module"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Enabled"),
              description: t("Enable or disable Bluetooth"),
            },
            {
              type: "select",
              name: "mode",
              label: t("Pairing mode"),
              description: t("Pin selection behaviour."),
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
              validationText: bluetoothValidationText,
              inputChange: bluetoothPinChangeEvent,
              label:t( "Pin"),
              description: t("Pin to use when pairing"),
              disabledBy: [
                {
                  fieldName: "mode",
                  selector:
                    Protobuf.Config.Config_BluetoothConfig_PairingMode
                      .FIXED_PIN,
                  invert: true,
                },
                {
                  fieldName: "enabled",
                },
              ],
              properties: {},
            },
          ],
        },
      ]}
    />
  );
};
