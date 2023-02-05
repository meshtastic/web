import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Select } from "@components/form/Select.js";
import { Toggle } from "@components/form/Toggle.js";
import { BluetoothValidation } from "@app/validation/config/bluetooth.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Bluetooth = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const { register, handleSubmit, control, reset } =
    useForm<BluetoothValidation>({
      mode: "onChange",
      defaultValues: config.bluetooth,
      resolver: classValidatorResolver(BluetoothValidation)
    });

  useEffect(() => {
    reset(config.bluetooth);
  }, [reset, config.bluetooth]);

  const onSubmit = handleSubmit((data) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "bluetooth",
          value: data
        }
      })
    );
  });

  const pairingMode = useWatch({
    control,
    name: "mode",
    defaultValue: Protobuf.Config_BluetoothConfig_PairingMode.RANDOM_PIN
  });

  return (
    <Form onSubmit={onSubmit}>
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Enabled"
            description="Enable or disable Bluetooth"
            checked={value}
            {...rest}
          />
        )}
      />
      <Select
        label="Pairing mode"
        description="Pin selection behaviour."
        {...register("mode", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_BluetoothConfig_PairingMode)}
      </Select>

      <Input
        disabled={
          pairingMode !== Protobuf.Config_BluetoothConfig_PairingMode.FIXED_PIN
        }
        label="Pin"
        description="Pin to use when pairing"
        type="number"
        {...register("fixedPin", {
          valueAsNumber: true
        })}
      />
    </Form>
  );
};
