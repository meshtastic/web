import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Toggle } from "@components/form/Toggle.js";
import { TelemetryValidation } from "@app/validation/moduleConfig/telemetry.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Telemetry = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { register, handleSubmit, reset, control } =
    useForm<TelemetryValidation>({
      mode: "onChange",
      defaultValues: moduleConfig.telemetry,
      resolver: classValidatorResolver(TelemetryValidation)
    });

  useEffect(() => {
    reset(moduleConfig.telemetry);
  }, [reset, moduleConfig.telemetry]);

  const onSubmit = handleSubmit((data) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig({
        payloadVariant: {
          case: "telemetry",
          value: data
        }
      })
    );
  });

  return (
    <form onChange={onSubmit}>
      <Controller
        name="environmentMeasurementEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Module Enabled"
            description="Enable the Environment Telemetry"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="environmentScreenEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Displayed on Screen"
            description="Show the Telemetry Module on the OLED"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="Update Interval"
        description="How often to send Metrics over the mesh"
        suffix="Seconds"
        type="number"
        {...register("environmentUpdateInterval", {
          valueAsNumber: true
        })}
      />
      <Controller
        name="environmentDisplayFahrenheit"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Display Fahrenheit"
            description="Display temp in Fahrenheit"
            checked={value}
            {...rest}
          />
        )}
      />
    </form>
  );
};
