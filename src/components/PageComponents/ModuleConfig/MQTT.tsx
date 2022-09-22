import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { MQTTValidation } from "@app/validation/moduleConfig/mqtt.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const MQTT = (): JSX.Element => {
  const { moduleConfig, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<MQTTValidation>({
    defaultValues: moduleConfig.mqtt,
    resolver: classValidatorResolver(MQTTValidation),
  });

  const moduleEnabled = useWatch({
    control,
    name: "enabled",
    defaultValue: false,
  });

  useEffect(() => {
    reset(moduleConfig.mqtt);
  }, [reset, moduleConfig.mqtt]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: "mqtt",
          mqtt: data,
        },
      },
      async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });
  return (
    <Form
      title="MQTT Config"
      breadcrumbs={["Module Config", "MQTT"]}
      reset={() => reset(moduleConfig.mqtt)}
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
        label="MQTT Server Address"
        description="Description"
        disabled={!moduleEnabled}
        {...register("address")}
      />
      <Input
        label="MQTT Username"
        description="Description"
        disabled={!moduleEnabled}
        {...register("username")}
      />
      <Input
        label="MQTT Password"
        description="Description"
        type="password"
        autoComplete="off"
        disabled={!moduleEnabled}
        {...register("password")}
      />
      <Controller
        name="encryptionEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Encryption Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="jsonEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="JSON Output Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
    </Form>
  );
};
