import type React from "react";
import { useEffect, useState } from "react";

import { FormField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm, useWatch } from "react-hook-form";

import { RangeTestValidation } from "@app/validation/moduleConfig/rangeTest.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const RangeTest = (): JSX.Element => {
  const { moduleConfig, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<RangeTestValidation>({
    defaultValues: moduleConfig.rangeTest,
    resolver: classValidatorResolver(RangeTestValidation),
  });

  useEffect(() => {
    reset(moduleConfig.rangeTest);
  }, [reset, moduleConfig.rangeTest]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection?.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: "rangeTest",
          rangeTest: data,
        },
      },
      async (): Promise<void> => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });

  const moduleEnabled = useWatch({
    control,
    name: "enabled",
    defaultValue: false,
  });

  return (
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <FormField
        label="Module Enabled"
        description="Description"
        isInvalid={!!errors.enabled?.message}
        validationMessage={errors.enabled?.message}
      >
        <Controller
          name="enabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        type="number"
        label="Message Interval"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        hint="Seconds"
        {...register("sender", {
          valueAsNumber: true,
        })}
      />
      <FormField
        label="Save CSV to storage"
        description="Description"
        disabled={!moduleEnabled}
        isInvalid={!!errors.save?.message}
        validationMessage={errors.save?.message}
      >
        <Controller
          name="save"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
    </Form>
  );
};
