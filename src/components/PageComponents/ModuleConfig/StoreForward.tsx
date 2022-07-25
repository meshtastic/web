import type React from "react";
import { useEffect, useState } from "react";

import { FormField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm, useWatch } from "react-hook-form";

import { StoreForwardValidation } from "@app/validation/moduleConfig/storeForward.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/stores/deviceStore.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const StoreForward = (): JSX.Element => {
  const { moduleConfig, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<StoreForwardValidation>({
    defaultValues: moduleConfig.storeForward,
    resolver: classValidatorResolver(StoreForwardValidation),
  });

  useEffect(() => {
    reset(moduleConfig.storeForward);
  }, [reset, moduleConfig.storeForward]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection?.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: "storeForward",
          storeForward: data,
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
        label="Heartbeat Enabled"
        description="Description"
        disabled={!moduleEnabled}
        isInvalid={!!errors.heartbeat?.message}
        validationMessage={errors.heartbeat?.message}
      >
        <Controller
          name="heartbeat"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        type="number"
        label="Number of records"
        description="Max transmit power in dBm"
        hint="Records"
        disabled={!moduleEnabled}
        {...register("records", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        type="number"
        label="History return max"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("historyReturnMax", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        type="number"
        label="History return window"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("historyReturnWindow", {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
