import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Toggle } from "@components/form/Toggle.js";
import { MQTTValidation } from "@app/validation/moduleConfig/mqtt.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const MQTT = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control
  } = useForm<MQTTValidation>({
    mode: "onChange",
    defaultValues: moduleConfig.mqtt,
    resolver: classValidatorResolver(MQTTValidation)
  });

  const moduleEnabled = useWatch({
    control,
    name: "enabled",
    defaultValue: false
  });

  useEffect(() => {
    reset(moduleConfig.mqtt);
  }, [reset, moduleConfig.mqtt]);

  const onSubmit = handleSubmit((data) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig({
        payloadVariant: {
          case: "mqtt",
          value: data
        }
      })
    );
  });

  return (
    <form onChange={onSubmit}>
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Module Enabled"
            description="Enable MQTT"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="MQTT Server Address"
        description="Description"
        disabled={!moduleEnabled}
        {...register("address")}
      />
      <Input
        label="MQTT Username"
        description="MQTT username to use for default/custom servers"
        disabled={!moduleEnabled}
        {...register("username")}
      />
      <Input
        label="MQTT Password"
        description="MQTT password to use for default/custom servers"
        type="password"
        autoComplete="off"
        disabled={!moduleEnabled}
        {...register("password")}
      />
      <Controller
        name="encryptionEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Encryption Enabled"
            //description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="jsonEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="JSON Output Enabled"
            description="Enable the sending / consumption of JSON packets on MQTT (Not encrypted)"
            checked={value}
            {...rest}
          />
        )}
      />
    </form>
  );
};
