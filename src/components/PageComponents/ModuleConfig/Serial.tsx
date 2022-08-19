import type React from "react";
import { useEffect, useState } from "react";

import { FormField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm, useWatch } from "react-hook-form";

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
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <FormField
        label="Module Enabled"
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
      <FormField
        label="Echo"
        description="Description"
        disabled={!moduleEnabled}
        isInvalid={!!errors.echo?.message}
        validationMessage={errors.echo?.message}
      >
        <Controller
          name="echo"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        type="number"
        label="RX"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("rxd", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        type="number"
        label="TX Pin"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("txd", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        type="number"
        label="Baud Rate"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("baud", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        type="number"
        label="Timeout"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("timeout", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
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
