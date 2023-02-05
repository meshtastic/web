import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormSection } from "@components/form/FormSection.js";
import { Input } from "@components/form/Input.js";
import { Toggle } from "@components/form/Toggle.js";
import { PowerValidation } from "@app/validation/config/power.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Power = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { register, handleSubmit, reset, control } = useForm<PowerValidation>({
    mode: "onChange",
    defaultValues: config.power,
    resolver: classValidatorResolver(PowerValidation)
  });

  useEffect(() => {
    reset(config.power);
  }, [reset, config.power]);

  const onSubmit = handleSubmit((data) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "power",
          value: data
        }
      })
    );
  });

  return (
    <Form onSubmit={onSubmit}>
      <Input
        label="Shutdown on battery delay"
        description="Automatically shutdown node after this long when on battery, 0 for indefinite"
        suffix="Seconds"
        type="number"
        {...register("onBatteryShutdownAfterSecs", { valueAsNumber: true })}
      />
      <Controller
        name="isPowerSaving"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Enable power saving mode"
            description="Select if powered from a low-current source (i.e. solar), to minimize power consumption as much as possible."
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="ADC Multiplier Override ratio"
        description="Used for tweaking battery voltage reading"
        type="number"
        {...register("adcMultiplierOverride", { valueAsNumber: true })}
      />
      <FormSection title="Sleep Settings">
        <Input
          label="Minimum Wake Time"
          description="Minimum amount of time the device will stay awake for after receiving a packet"
          suffix="Seconds"
          type="number"
          {...register("minWakeSecs", { valueAsNumber: true })}
        />
        <Input
          label="Mesh SDS Timeout"
          description="The device will enter super deep sleep after this time"
          suffix="Seconds"
          type="number"
          {...register("meshSdsTimeoutSecs", { valueAsNumber: true })}
        />
        <Input
          label="Super Deep Sleep Duration"
          description="How long the device will be in super deep sleep for"
          suffix="Seconds"
          type="number"
          {...register("sdsSecs", { valueAsNumber: true })}
        />
        <Input
          label="Light Sleep Duration"
          description="How long the device will be in light sleep for"
          suffix="Seconds"
          type="number"
          {...register("lsSecs", { valueAsNumber: true })}
        />
      </FormSection>
      <Input
        label="No Connection Bluetooth Disabled"
        description="If the device does not receive a Bluetooth connection, the BLE radio will be disabled after this long"
        suffix="Seconds"
        type="number"
        {...register("waitBluetoothSecs", { valueAsNumber: true })}
      />
    </Form>
  );
};
