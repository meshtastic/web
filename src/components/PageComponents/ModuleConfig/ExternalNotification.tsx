import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { ExternalNotificationValidation } from "@app/validation/moduleConfig/externalNotification.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const ExternalNotification = (): JSX.Element => {
  const { moduleConfig, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<ExternalNotificationValidation>({
    defaultValues: moduleConfig.externalNotification,
    resolver: classValidatorResolver(ExternalNotificationValidation),
  });
  useEffect(() => {
    reset(moduleConfig.externalNotification);
  }, [reset, moduleConfig.externalNotification]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection?.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: "externalNotification",
          externalNotification: data,
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
      title="External Notification Config"
      breadcrumbs={["Module Config", "External Notification"]}
      reset={() => reset(moduleConfig.externalNotification)}
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
      <Input
        type="number"
        label="Output MS"
        description="Max transmit power in dBm"
        suffix="ms"
        disabled={!moduleEnabled}
        {...register("outputMs", {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Output"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("output", {
          valueAsNumber: true,
        })}
      />
      <Controller
        name="active"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Active"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="alertMessage"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Message"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="alertBell"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Bell"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
    </Form>
  );
};
