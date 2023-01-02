import type React from "react";
import { useEffect } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "react-hot-toast";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { SerialValidation } from "@app/validation/moduleConfig/serial.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { renderOptions } from "@app/core/utils/selectEnumOptions";
import { Select } from "@app/components/form/Select";

export const Serial = (): JSX.Element => {
  const { moduleConfig, connection, setModuleConfig } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control
  } = useForm<SerialValidation>({
    defaultValues: moduleConfig.serial,
    resolver: classValidatorResolver(SerialValidation)
  });

  useEffect(() => {
    reset(moduleConfig.serial);
  }, [reset, moduleConfig.serial]);

  const onSubmit = handleSubmit((data) => {
    if (connection) {
      void toast.promise(
        connection
          .setModuleConfig({
            moduleConfig: {
              payloadVariant: {
                oneofKind: "serial",
                serial: data
              }
            }
          })
          .then(() =>
            setModuleConfig({
              payloadVariant: {
                oneofKind: "serial",
                serial: data
              }
            })
          ),
        {
          loading: "Saving...",
          success: "Saved Serial Config, Restarting Node",
          error: "No response received"
        }
      );
    }
  });

  const moduleEnabled = useWatch({
    control,
    name: "enabled",
    defaultValue: false
  });

  return (
    <Form
      title="Serial Config"
      breadcrumbs={["Module Config", "Serial"]}
      reset={() => reset(moduleConfig.serial)}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Module Enabled"
            description="Enable Serial output"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="echo"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Echo"
            description="Any packets you send will be echoed back to your device"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        type="number"
        label="RX Pin"
        description="Set the GPIO pin to the RXD pin you have set up."
        disabled={!moduleEnabled}
        {...register("rxd", {
          valueAsNumber: true
        })}
      />
      <Input
        type="number"
        label="TX Pin"
        description="Set the GPIO pin to the TXD pin you have set up."
        disabled={!moduleEnabled}
        {...register("txd", {
          valueAsNumber: true
        })}
      />
      <Select
        label="Baud Rate"
        description="The serial baud rate"
        disabled={!moduleEnabled}
        {...register("baud", { valueAsNumber: true })}
        >
        {renderOptions(Protobuf.ModuleConfig_SerialConfig_Serial_Baud)}
        </Select>
      <Input
        type="number"
        label="Timeout"
        suffix="Seconds"
        description="Seconds to wait before we consider your packet as 'done'"
        disabled={!moduleEnabled}
        {...register("timeout", {
          valueAsNumber: true
        })}
      />
      <Select
        label="Mode"
        description="Select Mode"
        disabled={!moduleEnabled}
        {...register("mode", { valueAsNumber: true })}
        > 
        {renderOptions(Protobuf.ModuleConfig_SerialConfig_Serial_Mode)}
      </Select>
    </Form>
  );
};
