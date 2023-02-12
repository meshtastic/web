import type { BluetoothValidation } from "@app/validation/config/bluetooth.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm } from "@app/components/DynamicForm.js";

export const Bluetooth = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: BluetoothValidation) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "bluetooth",
          value: data
        }
      })
    );
  };

  return (
    <DynamicForm<BluetoothValidation>
      onSubmit={onSubmit}
      defaultValues={config.bluetooth}
      fieldGroups={[
        {
          label: "Bluetooth Settings",
          description: "Settings for the Bluetooth module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Enabled",
              description: "Enable or disable Bluetooth"
            },
            {
              type: "select",
              name: "mode",
              label: "Pairing mode",
              description: "Pin selection behaviour.",
              enumValue: Protobuf.Config_BluetoothConfig_PairingMode,
              formatEnumName: true,
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "number",
              name: "fixedPin",
              label: "Pin",
              description: "Pin to use when pairing",
              disabledBy: [
                {
                  fieldName: "mode",
                  selector:
                    Protobuf.Config_BluetoothConfig_PairingMode.FIXED_PIN,
                  invert: true
                },
                {
                  fieldName: "enabled"
                }
              ]
            }
          ]
        }
      ]}
    />
  );
};
