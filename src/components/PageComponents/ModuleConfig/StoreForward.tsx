import type React from "react";
import { useEffect } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "react-hot-toast";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { StoreForwardValidation } from "@app/validation/moduleConfig/storeForward.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const StoreForward = (): JSX.Element => {
  const { moduleConfig, connection, setModuleConfig } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control
  } = useForm<StoreForwardValidation>({
    defaultValues: moduleConfig.storeForward,
    resolver: classValidatorResolver(StoreForwardValidation)
  });

  useEffect(() => {
    reset(moduleConfig.storeForward);
  }, [reset, moduleConfig.storeForward]);

  const onSubmit = handleSubmit((data) => {
    if (connection) {
      void toast.promise(
        connection
          .setModuleConfig(
            new Protobuf.ModuleConfig({
              payloadVariant: {
                case: "storeForward",
                value: data
              }
            })
          )
          .then(() =>
            setModuleConfig(
              new Protobuf.ModuleConfig({
                payloadVariant: {
                  case: "storeForward",
                  value: data
                }
              })
            )
          ),
        {
          loading: "Saving...",
          success: "Saved Store & Forward Config, Restarting Node",
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
    <Form onSubmit={onSubmit}>
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Module Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="heartbeat"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Heartbeat Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        type="number"
        label="Number of records"
        description="Max transmit power in dBm"
        suffix="Records"
        disabled={!moduleEnabled}
        {...register("records", {
          valueAsNumber: true
        })}
      />
      <Input
        type="number"
        label="History return max"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("historyReturnMax", {
          valueAsNumber: true
        })}
      />
      <Input
        type="number"
        label="History return window"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("historyReturnWindow", {
          valueAsNumber: true
        })}
      />
    </Form>
  );
};
