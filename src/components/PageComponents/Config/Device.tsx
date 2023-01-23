import type React from "react";
import { useEffect } from "react";

import { Controller, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

import { Input } from "@app/components/form/Input.js";
import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { DeviceValidation } from "@app/validation/config/device.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Device = (): JSX.Element => {
  const { config, connection, setConfig } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset
  } = useForm<DeviceValidation>({
    defaultValues: config.device,
    resolver: classValidatorResolver(DeviceValidation)
  });

  useEffect(() => {
    reset(config.device);
  }, [reset, config.device]);

  const onSubmit = handleSubmit((data) => {
    if (connection) {
      void toast.promise(
        connection
          .setConfig(
            new Protobuf.Config({
              payloadVariant: {
                case: "device",
                value: data
              }
            })
          )
          .then(() =>
            setConfig(
              new Protobuf.Config({
                payloadVariant: {
                  case: "device",
                  value: data
                }
              })
            )
          ),
        {
          loading: "Saving...",
          success: "Saved Device Config, Restarting Node",
          error: "No response received"
        }
      );
    }
  });

  return (
    <Form
      onSubmit={onSubmit}
    >
      <Select
        label="Role"
        description="What role the device performs on the mesh"
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
            description="Disable the device's serial console"
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
            description="Output debugging information to the device's serial port (auto disables when serial client is connected)"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="Button Pin"
        description="Button pin override"
        type="number"
        error={errors.buttonGpio?.message}
        {...register("buttonGpio", { valueAsNumber: true })}
      />
      <Input
        label="Buzzer Pin"
        description="Buzzer pin override"
        type="number"
        error={errors.buzzerGpio?.message}
        {...register("buzzerGpio", { valueAsNumber: true })}
      />
    </Form>
  );
};
