import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { BluetoothValidation } from "@app/validation/config/bluetooth.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Bluetooth = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
  } = useForm<BluetoothValidation>({
    defaultValues: config.bluetooth,
    resolver: classValidatorResolver(BluetoothValidation),
  });

  useEffect(() => {
    reset(config.bluetooth);
  }, [reset, config.bluetooth]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "bluetooth",
          bluetooth: data,
        },
      },
      async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });

  const pairingMode = useWatch({
    control,
    name: "mode",
    defaultValue: Protobuf.Config_BluetoothConfig_PairingMode.RANDOM_PIN,
  });

  return (
    <Form
      title="Bluetooth Config"
      breadcrumbs={["Config", "Bluetooth"]}
      reset={() => reset(config.bluetooth)}
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Select
        label="Pairing mode"
        description="This is a description."
        {...register("mode", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_BluetoothConfig_PairingMode)}
      </Select>

      <Input
        disabled={
          pairingMode !== Protobuf.Config_BluetoothConfig_PairingMode.FIXED_PIN
        }
        label="Pin"
        description="This is a description."
        type="number"
        {...register("fixedPin", {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
