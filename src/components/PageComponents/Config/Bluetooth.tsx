import { useAppStore } from "../../../core/stores/appStore.ts";
import type { BluetoothValidation } from "@app/validation/config/bluetooth.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Bluetooth = () => {
  const { config, setWorkingConfig } = useDevice();
  const {
    hasErrors,
    getErrorMessage,
    hasFieldError,
    addError,
    removeError,
    clearErrors,
  } = useAppStore();
  const { t } = useTranslation();

  const [bluetoothPin, setBluetoothPin] = useState(
    config?.bluetooth?.fixedPin.toString() ?? "",
  );

  const validateBluetoothPin = (pin: string) => {
    // if empty show error they need a pin set
    if (pin === "") {
      return addError("fixedPin", t("config_bluetooth_validation_pinRequired"));
    }

    // clear any existing errors
    clearErrors();

    // if it starts with 0 show error
    if (pin[0] === "0") {
      return addError(
        "fixedPin",
        t("config_bluetooth_validation_pinCannotStartWithZero"),
      );
    }
    // if it's not 6 digits show error
    if (pin.length < 6) {
      return addError(
        "fixedPin",
        t("config_bluetooth_validation_pinMustBeSixDigits"),
      );
    }

    removeError("fixedPin");
  };

  const bluetoothPinChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, "").slice(0, 6);
    setBluetoothPin(numericValue);
    validateBluetoothPin(numericValue);
  };

  const onSubmit = (data: BluetoothValidation) => {
    if (hasErrors()) {
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
      defaultValues={config.bluetooth}
      fieldGroups={[
        {
          label: t("config_bluetooth_groupLabel_bluetoothSettings"),
          description: t("config_bluetooth_groupDescription_bluetoothSettings"),
          notes: t("config_bluetooth_groupNotes_bluetoothWifiNote"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("config_bluetooth_fieldLabel_enabled"),
              description: t("config_bluetooth_fieldDescription_enabled"),
            },
            {
              type: "select",
              name: "mode",
              label: t("config_bluetooth_fieldLabel_pairingMode"),
              description: t("config_bluetooth_fieldDescription_pairingMode"),
              selectChange: (e) => {
                if (e !== "1") {
                  setBluetoothPin("");
                  removeError("fixedPin");
                }
              },
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
              label: t("config_bluetooth_fieldLabel_pin"),
              description: t("config_bluetooth_fieldDescription_pin"),
              validationText: hasFieldError("fixedPin")
                ? getErrorMessage("fixedPin")
                : "",
              inputChange: bluetoothPinChangeEvent,
              disabledBy: [
                {
                  fieldName: "mode",
                  selector: Protobuf.Config.Config_BluetoothConfig_PairingMode
                    .FIXED_PIN,
                  invert: true,
                },
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                value: bluetoothPin,
              },
            },
          ],
        },
      ]}
    />
  );
};
