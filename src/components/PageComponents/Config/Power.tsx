import type React from "react";
import { useEffect, useState } from "react";

import { FormField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm } from "react-hook-form";

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
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <TextInputField
        label="Shutdown on battery delay"
        description="This is a description."
        hint="Seconds"
        type="number"
        isInvalid={!!errors.onBatteryShutdownAfterSecs?.message}
        validationMessage={errors.onBatteryShutdownAfterSecs?.message}
        {...register("onBatteryShutdownAfterSecs", { valueAsNumber: true })}
      />
      <FormField
        label="Power Saving"
        description="Description"
        isInvalid={!!errors.isPowerSaving?.message}
        validationMessage={errors.isPowerSaving?.message}
      >
        <Controller
          name="isPowerSaving"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        label="ADC Multiplier Override ratio"
        description="This is a description."
        type="number"
        isInvalid={!!errors.adcMultiplierOverride?.message}
        validationMessage={errors.adcMultiplierOverride?.message}
        {...register("adcMultiplierOverride", { valueAsNumber: true })}
      />
      <TextInputField
        label="Minimum Wake Time"
        description="This is a description."
        hint="Seconds"
        type="number"
        isInvalid={!!errors.minWakeSecs?.message}
        validationMessage={errors.minWakeSecs?.message}
        {...register("minWakeSecs", { valueAsNumber: true })}
      />
      <TextInputField
        label="Mesh SDS Timeout"
        description="This is a description."
        hint="Seconds"
        type="number"
        isInvalid={!!errors.meshSdsTimeoutSecs?.message}
        validationMessage={errors.meshSdsTimeoutSecs?.message}
        {...register("meshSdsTimeoutSecs", { valueAsNumber: true })}
      />
      <TextInputField
        label="SDS"
        description="This is a description."
        hint="Seconds"
        type="number"
        isInvalid={!!errors.sdsSecs?.message}
        validationMessage={errors.sdsSecs?.message}
        {...register("sdsSecs", { valueAsNumber: true })}
      />
      <TextInputField
        label="LS"
        description="This is a description."
        hint="Seconds"
        type="number"
        isInvalid={!!errors.lsSecs?.message}
        validationMessage={errors.lsSecs?.message}
        {...register("lsSecs", { valueAsNumber: true })}
      />
      <TextInputField
        label="Wait Bluetooth"
        description="This is a description."
        hint="Seconds"
        type="number"
        isInvalid={!!errors.waitBluetoothSecs?.message}
        validationMessage={errors.waitBluetoothSecs?.message}
        {...register("waitBluetoothSecs", { valueAsNumber: true })}
      />
    </Form>
  );
};
