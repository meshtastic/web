import type React from "react";
import { useEffect } from "react";

import { Controller, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

import { FormSection } from "@app/components/form/FormSection.js";
import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { PowerValidation } from "@app/validation/config/power.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const Power = (): JSX.Element => {
  const { config, connection } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control
  } = useForm<PowerValidation>({
    defaultValues: config.power,
    resolver: classValidatorResolver(PowerValidation)
  });

  useEffect(() => {
    reset(config.power);
  }, [reset, config.power]);

  const onSubmit = handleSubmit((data) => {
    if (connection) {
      void toast.promise(
        connection.setConfig({
          config: {
            payloadVariant: {
              oneofKind: "power",
              power: data
            }
          },
          callback: async () => {
            reset({ ...data });
            await Promise.resolve();
          }
        }),
        {
          loading: "Saving...",
          success: "Saved Power Config, Restarting Node",
          error: "No response received"
        }
      );
    }
  });

  return (
    <Form
      title="Power Config"
      breadcrumbs={["Config", "Power"]}
      reset={() => reset(config.power)}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Input
        label="Shutdown on battery delay"
        description="Automatically shutdown node after this long when on battery, 0 for indefinite"
        suffix="Seconds"
        type="number"
        error={errors.onBatteryShutdownAfterSecs?.message}
        {...register("onBatteryShutdownAfterSecs", { valueAsNumber: true })}
      />
      <Controller
        name="isPowerSaving"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Enable power saving mode"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="ADC Multiplier Override ratio"
        description="Used for tweaking battery voltage reading"
        type="number"
        error={errors.adcMultiplierOverride?.message}
        {...register("adcMultiplierOverride", { valueAsNumber: true })}
      />
      <FormSection title="Sleep Settings">
        <Input
          label="Minimum Wake Time"
          description="Minimum amount of time the device will stay awake for after receiving a packet"
          suffix="Seconds"
          type="number"
          error={errors.minWakeSecs?.message}
          {...register("minWakeSecs", { valueAsNumber: true })}
        />
        <Input
          label="Mesh SDS Timeout"
          description="The device will enter super deep sleep after this time"
          suffix="Seconds"
          type="number"
          error={errors.meshSdsTimeoutSecs?.message}
          {...register("meshSdsTimeoutSecs", { valueAsNumber: true })}
        />
        <Input
          label="Super Deep Sleep Duration"
          description="How long the device will be in super deep sleep for"
          suffix="Seconds"
          type="number"
          error={errors.sdsSecs?.message}
          {...register("sdsSecs", { valueAsNumber: true })}
        />
        <Input
          label="Light Sleep Duration"
          description="How long the device will be in light sleep for"
          suffix="Seconds"
          type="number"
          error={errors.lsSecs?.message}
          {...register("lsSecs", { valueAsNumber: true })}
        />
      </FormSection>
      <Input
        label="No Connection Bluetooth Disabled"
        description="If the device does not revieve a bluetooth connection, the BLE radio will be disabled after this long"
        suffix="Seconds"
        type="number"
        error={errors.waitBluetoothSecs?.message}
        {...register("waitBluetoothSecs", { valueAsNumber: true })}
      />
    </Form>
  );
};
