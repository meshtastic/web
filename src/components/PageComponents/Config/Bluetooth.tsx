import { useAppStore } from "../../../core/stores/appStore.ts";
import type { BluetoothValidation } from "@app/validation/config/bluetooth.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useState } from "react";

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

  const [bluetoothPin, setBluetoothPin] = useState(
    config?.bluetooth?.fixedPin.toString() ?? "",
  );

  const validateBluetoothPin = (pin: string) => {
    // if empty show error they need a pin set
    if (pin === "") {
      return addError("fixedPin", "Bluetooth Pin is required");
    }

    // clear any existing errors
    clearErrors();

    // if it starts with 0 show error
    if (pin[0] === "0") {
      return addError("fixedPin", "Bluetooth Pin cannot start with 0");
    }
    // if it's not 6 digits show error
    if (pin.length < 6) {
      return addError("fixedPin", "Pin must be 6 digits");
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
          label: "Bluetooth Settings",
          description: "Settings for the Bluetooth module ",
          notes:
            "Note: Some devices (ESP32) cannot use both Bluetooth and WiFi at the same time.",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Enabled",
              description: "Enable or disable Bluetooth",
            },
            {
              type: "select",
              name: "mode",
              label: "Pairing mode",
              description: "Pin selection behaviour.",
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
              label: "Pin",
              description: "Pin to use when pairing",
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
