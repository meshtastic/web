import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { SerialValidation } from "@app/validation/moduleConfig/serial.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const Serial = (): JSX.Element => {
  const { moduleConfig, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<SerialValidation>({
    defaultValues: moduleConfig.serial,
    resolver: classValidatorResolver(SerialValidation),
  });

  useEffect(() => {
    reset(moduleConfig.serial);
  }, [reset, moduleConfig.serial]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection?.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: "serial",
          serial: data,
        },
      },
      async (): Promise<void> => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });

  const moduleEnabled = useWatch({
    control,
    name: "enabled",
    defaultValue: false,
  });

  return (
    <Form
      title="Serial Config"
      breadcrumbs={["Module Config", "Serial"]}
      reset={() => reset(moduleConfig.serial)}
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Module Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="echo"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Echo"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        type="number"
        label="RX"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("rxd", {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="TX Pin"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("txd", {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Baud Rate"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("baud", {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Timeout"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("timeout", {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Mode"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("mode", {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
