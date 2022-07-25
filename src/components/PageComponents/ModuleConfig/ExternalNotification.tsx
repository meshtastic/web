import type React from "react";
import { useEffect, useState } from "react";

import { FormField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm, useWatch } from "react-hook-form";

import { ExternalNotificationValidation } from "@app/validation/moduleConfig/externalNotification.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/stores/deviceStore.js";
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
      <TextInputField
        type="number"
        label="Output MS"
        description="Max transmit power in dBm"
        hint="ms"
        disabled={!moduleEnabled}
        {...register("outputMs", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        type="number"
        label="Output"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("output", {
          valueAsNumber: true,
        })}
      />
      <FormField
        label="Active"
        description="Description"
        disabled={!moduleEnabled}
        isInvalid={!!errors.active?.message}
        validationMessage={errors.active?.message}
      >
        <Controller
          name="active"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Message"
        description="Description"
        disabled={!moduleEnabled}
        isInvalid={!!errors.alertMessage?.message}
        validationMessage={errors.alertMessage?.message}
      >
        <Controller
          name="alertMessage"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Bell"
        description="Description"
        disabled={!moduleEnabled}
        isInvalid={!!errors.alertBell?.message}
        validationMessage={errors.alertBell?.message}
      >
        <Controller
          name="alertBell"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
    </Form>
  );
};
