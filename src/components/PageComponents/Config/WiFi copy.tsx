import type React from "react";
import { useEffect, useState } from "react";

import { FormField, Switch, TextInputField, toaster } from "evergreen-ui";
import { Controller, useForm } from "react-hook-form";

import { WiFiValidation } from "@app/validation/config/wifi.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/stores/deviceStore.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const WiFi = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
  } = useForm<WiFiValidation>({
    defaultValues: config.wifi,
    resolver: classValidatorResolver(WiFiValidation),
  });

  useEffect(() => {
    reset(config.wifi);
  }, [reset, config.wifi]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "wifi",
          wifi: data,
        },
      },
      async () => {
        toaster.success("Your source is now sending data");
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });
  return (
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <TextInputField
        label="SSID"
        description="This is a description."
        isInvalid={!!errors.ssid?.message}
        validationMessage={errors.ssid?.message}
        {...register("ssid", { valueAsNumber: true })}
      />
      <TextInputField
        label="PSK"
        description="This is a description."
        type="password"
        isInvalid={!!errors.psk?.message}
        validationMessage={errors.psk?.message}
        {...register("psk", { valueAsNumber: true })}
      />
      <FormField
        label="Enable WiFi AP"
        description="Description"
        isInvalid={!!errors.apMode?.message}
        validationMessage={errors.apMode?.message}
      >
        <Controller
          name="apMode"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Don't broadcast SSID"
        description="Description"
        isInvalid={!!errors.apHidden?.message}
        validationMessage={errors.apHidden?.message}
      >
        <Controller
          name="apHidden"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
    </Form>
  );
};
