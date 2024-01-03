import type { BluetoothValidation } from "@app/validation/config/bluetooth.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const Bluetooth = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: BluetoothValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
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
          description: "Settings for the Bluetooth module",
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
