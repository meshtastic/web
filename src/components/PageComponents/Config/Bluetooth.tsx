import type React from "react";
import { useEffect, useState } from "react";

import { FormField, SelectField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm, useWatch } from "react-hook-form";

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
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <FormField
        label="Bluetooth Enabled"
        description="Description"
        isInvalid={!!errors.enabled?.message}
        validationMessage={errors.enabled?.message}
      >
        <Controller
          name="enabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>

      <SelectField
        label="Pairing mode"
        description="This is a description."
        isInvalid={!!errors.mode?.message}
        validationMessage={errors.mode?.message}
        {...register("mode", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_BluetoothConfig_PairingMode)}
      </SelectField>

      <TextInputField
        display={
          pairingMode !== Protobuf.Config_BluetoothConfig_PairingMode.FIXED_PIN
            ? "none"
            : "block"
        }
        label="Pin"
        description="This is a description."
        type="number"
        isInvalid={!!errors.fixedPin?.message}
        validationMessage={errors.fixedPin?.message}
        {...register("fixedPin", {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
