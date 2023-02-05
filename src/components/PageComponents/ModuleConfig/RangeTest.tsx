import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Toggle } from "@components/form/Toggle.js";
import { RangeTestValidation } from "@app/validation/moduleConfig/rangeTest.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/stores/deviceStore.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const RangeTest = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { register, handleSubmit, reset, control } =
    useForm<RangeTestValidation>({
      mode: "onChange",
      defaultValues: moduleConfig.rangeTest,
      resolver: classValidatorResolver(RangeTestValidation)
    });

  useEffect(() => {
    reset(moduleConfig.rangeTest);
  }, [reset, moduleConfig.rangeTest]);

  const onSubmit = handleSubmit((data) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig({
        payloadVariant: {
          case: "rangeTest",
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
    <Form onSubmit={onSubmit}>
      <Controller
        name="enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle label="Module Enabled" checked={value} {...rest} />
        )}
      />
      <Input
        type="number"
        label="Message Interval"
        description="How long to wait between sending test packets"
        disabled={!moduleEnabled}
        suffix="Seconds"
        {...register("sender", {
          valueAsNumber: true
        })}
      />
      <Controller
        name="save"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Save CSV to storage"
            description="ESP32 Only"
            checked={value}
            {...rest}
          />
        )}
      />
    </Form>
  );
};
