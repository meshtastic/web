import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { PowerValidation } from "@app/validation/config/power.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const Power = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<PowerValidation>({
    defaultValues: config.power,
    resolver: classValidatorResolver(PowerValidation),
  });

  useEffect(() => {
    reset(config.power);
  }, [reset, config.power]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "power",
          power: data,
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
      title="Power Config"
      breadcrumbs={["Config", "Power"]}
      reset={() => reset(config.power)}
      loading={loading}
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
      <Input
        label="Minimum Wake Time"
        description="Minimum amount of time the device will stay away for after recieving a packet"
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
