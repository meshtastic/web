import type React from "react";
import { useEffect, useState } from "react";

import { FormField, SelectField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm } from "react-hook-form";

import { TelemetryValidation } from "@app/validation/moduleConfig/telemetry.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/stores/deviceStore.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Telemetry = (): JSX.Element => {
  const { moduleConfig, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<TelemetryValidation>({
    defaultValues: moduleConfig.telemetry,
    resolver: classValidatorResolver(TelemetryValidation),
  });

  useEffect(() => {
    reset(moduleConfig.telemetry);
  }, [reset, moduleConfig.telemetry]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: "telemetry",
          telemetry: data,
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
      <FormField
        label="Measurement Enabled"
        description="Description"
        isInvalid={!!errors.environmentMeasurementEnabled?.message}
        validationMessage={errors.environmentMeasurementEnabled?.message}
      >
        <Controller
          name="environmentMeasurementEnabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Displayed on Screen"
        description="Description"
        isInvalid={!!errors.environmentScreenEnabled?.message}
        validationMessage={errors.environmentScreenEnabled?.message}
      >
        <Controller
          name="environmentScreenEnabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        label="Read Error Count Threshold"
        description="Max transmit power in dBm"
        type="number"
        {...register("environmentReadErrorCountThreshold", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        label="Update Interval"
        description="Max transmit power in dBm"
        hint="Seconds"
        type="number"
        {...register("environmentUpdateInterval", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        label="Recovery Interval"
        description="Max transmit power in dBm"
        hint="Seconds"
        type="number"
        {...register("environmentRecoveryInterval", {
          valueAsNumber: true,
        })}
      />
      <FormField
        label="Display Farenheit"
        description="Description"
        isInvalid={!!errors.environmentDisplayFahrenheit?.message}
        validationMessage={errors.environmentDisplayFahrenheit?.message}
      >
        <Controller
          name="environmentDisplayFahrenheit"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <SelectField
        label="Sensor Type"
        description="This is a description."
        {...register("environmentSensorType", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.TelemetrySensorType)}
      </SelectField>
      <TextInputField
        label="Sensor Pin"
        description="Max transmit power in dBm"
        type="number"
        {...register("environmentSensorPin", {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
