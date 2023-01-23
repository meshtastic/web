import type React from "react";
import { useEffect } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "react-hot-toast";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { ExternalNotificationValidation } from "@app/validation/moduleConfig/externalNotification.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const ExternalNotification = (): JSX.Element => {
  const { moduleConfig, connection, setModuleConfig } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control
  } = useForm<ExternalNotificationValidation>({
    defaultValues: moduleConfig.externalNotification,
    resolver: classValidatorResolver(ExternalNotificationValidation)
  });
  useEffect(() => {
    reset(moduleConfig.externalNotification);
  }, [reset, moduleConfig.externalNotification]);

  const onSubmit = handleSubmit((data) => {
    if (connection) {
      void toast.promise(
        connection
          .setModuleConfig(
            new Protobuf.ModuleConfig({
              payloadVariant: {
                case: "externalNotification",
                value: data
              }
            })
          )
          .then(() =>
            setModuleConfig(
              new Protobuf.ModuleConfig({
                payloadVariant: {
                  case: "externalNotification",
                  value: data
                }
              })
            )
          ),
        {
          loading: "Saving...",
          success: "Saved External Notification Config, Restarting Node",
          error: "No response received"
        }
      );
    }
  });

  const moduleEnabled = useWatch({
    control,
    name: "enabled",
    defaultValue: false
  });

  return (
    <Form onSubmit={onSubmit}>
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Module Enabled"
            description="Enable External Notification"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        type="number"
        label="Output MS"
        description="Description"
        suffix="ms"
        disabled={!moduleEnabled}
        {...register("outputMs", {
          valueAsNumber: true
        })}
      />
      <Input
        type="number"
        label="Output"
        description="Description"
        disabled={!moduleEnabled}
        {...register("output", {
          valueAsNumber: true
        })}
      />
      <Input
        type="number"
        label="Output Vibrate"
        description="Description"
        disabled={!moduleEnabled}
        {...register("outputVibra", {
          valueAsNumber: true
        })}
      />
      <Input
        type="number"
        label="Output Buzzer"
        description="Description"
        disabled={!moduleEnabled}
        {...register("outputBuzzer", {
          valueAsNumber: true
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
            label="Alert Message"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="alertMessageVibra"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Alert Message Vibrate"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="alertMessageBuzzer"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Alert Message Buzzer"
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
            label="Alert Bell"
            description="Should an alert be triggered when receiving an incoming bell?"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="alertBellVibra"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Alert Bell Vibrate"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="alertBellBuzzer"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Alert Bell Buzzer"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="usePwm"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Use PWM"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        type="number"
        label="Nag Timeout"
        description="Description"
        disabled={!moduleEnabled}
        {...register("nagTimeout", {
          valueAsNumber: true
        })}
      />
    </Form>
  );
};
