import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Toggle } from "@components/form/Toggle.js";
import { StoreForwardValidation } from "@app/validation/moduleConfig/storeForward.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const StoreForward = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { register, handleSubmit, reset, control } =
    useForm<StoreForwardValidation>({
      mode: "onChange",
      defaultValues: moduleConfig.storeForward,
      resolver: classValidatorResolver(StoreForwardValidation)
    });

  useEffect(() => {
    reset(moduleConfig.storeForward);
  }, [reset, moduleConfig.storeForward]);

  const onSubmit = handleSubmit((data) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig({
        payloadVariant: {
          case: "storeForward",
          value: data
        }
      })
    );
  });

  const moduleEnabled = useWatch({
    control,
    name: "enabled",
    defaultValue: false
  });

  return (
    <form onChange={onSubmit}>
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
    </form>
  );
};
