import type React from "react";
import { useEffect } from "react";

import { Controller, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { TelemetryValidation } from "@app/validation/moduleConfig/telemetry.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const Telemetry = (): JSX.Element => {
  const { moduleConfig, connection, setModuleConfig } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control
  } = useForm<TelemetryValidation>({
    defaultValues: moduleConfig.telemetry,
    resolver: classValidatorResolver(TelemetryValidation)
  });

  useEffect(() => {
    reset(moduleConfig.telemetry);
  }, [reset, moduleConfig.telemetry]);

  const onSubmit = handleSubmit((data) => {
    if (connection) {
      void toast.promise(
        connection
          .setModuleConfig({
            moduleConfig: {
              payloadVariant: {
                oneofKind: "telemetry",
                telemetry: data
              }
            }
          })
          .then(() =>
            setModuleConfig({
              payloadVariant: {
                oneofKind: "telemetry",
                telemetry: data
              }
            })
          ),
        {
          loading: "Saving...",
          success: "Saved Telemetry Config, Restarting Node",
          error: "No response received"
        }
      );
    }
  });

  return (
    <Form
      title="Telemetry Config"
      breadcrumbs={["Module Config", "Telemetry"]}
      reset={() => reset(moduleConfig.telemetry)}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
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
    </Form>
  );
};
