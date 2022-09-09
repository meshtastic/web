import type React from "react";
import { useEffect, useState } from "react";

import { FormField, SelectField, Switch, toaster } from "evergreen-ui";
import { Controller, useForm } from "react-hook-form";

import { DeviceValidation } from "@app/validation/config/device.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Device = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
  } = useForm<DeviceValidation>({
    defaultValues: config.device,
    resolver: classValidatorResolver(DeviceValidation),
  });

  useEffect(() => {
    reset(config.device);
  }, [reset, config.device]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "device",
          device: data,
        },
      },
      async () => {
        toaster.success("Successfully updated device config");
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });
  return (
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <SelectField
        label="Role"
        description="This is a description."
        isInvalid={!!errors.role?.message}
        validationMessage={errors.role?.message}
        {...register("role", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DeviceConfig_Role)}
      </SelectField>
      <FormField
        label="Serial Console Disabled"
        description="Description"
        isInvalid={!!errors.serialDisabled?.message}
        validationMessage={errors.serialDisabled?.message}
      >
        <Controller
          name="serialDisabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Factory Reset Device"
        description="Description"
        isInvalid={!!errors.factoryReset?.message}
        validationMessage={errors.factoryReset?.message}
      >
        <Controller
          name="factoryReset"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Enabled Debug Log"
        description="Description"
        isInvalid={!!errors.debugLogEnabled?.message}
        validationMessage={errors.debugLogEnabled?.message}
      >
        <Controller
          name="debugLogEnabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
    </Form>
  );
};
