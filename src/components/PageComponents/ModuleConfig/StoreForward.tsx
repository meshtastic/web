import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";

import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { StoreForwardValidation } from "@app/validation/moduleConfig/storeForward.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";

export const StoreForward = (): JSX.Element => {
  const { moduleConfig, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<StoreForwardValidation>({
    defaultValues: moduleConfig.storeForward,
    resolver: classValidatorResolver(StoreForwardValidation),
  });

  useEffect(() => {
    reset(moduleConfig.storeForward);
  }, [reset, moduleConfig.storeForward]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection?.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: "storeForward",
          storeForward: data,
        },
      },
      async (): Promise<void> => {
        reset({ ...data });
        setLoading(false);
        toast.success("Saved Stora & Forward Config, Restarting Node");
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
    <Form
      title="Store & Forward Config"
      breadcrumbs={["Module Config", "Store & Forward"]}
      reset={() => reset(moduleConfig.storeForward)}
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
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
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="History return max"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("historyReturnMax", {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="History return window"
        description="Max transmit power in dBm"
        disabled={!moduleEnabled}
        {...register("historyReturnWindow", {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
