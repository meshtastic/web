import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm } from "react-hook-form";

import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
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
        // toaster.success("Successfully updated device config");
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });
  return (
    <Form
      title="Device Config"
      breadcrumbs={["Config", "Device"]}
      reset={() => reset(config.device)}
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Select
        label="Role"
        description="This is a description."
        {...register("role", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DeviceConfig_Role)}
      </Select>
      <Controller
        name="serialEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Serial Output Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="debugLogEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Enabled Debug Log"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
    </Form>
  );
};
