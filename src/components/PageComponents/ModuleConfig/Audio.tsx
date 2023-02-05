import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Select } from "@components/form/Select.js";
import { Toggle } from "@components/form/Toggle.js";
import { AudioValidation } from "@app/validation/moduleConfig/audio.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/stores/deviceStore.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Audio = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { register, handleSubmit, reset, control } = useForm<AudioValidation>({
    mode: "onChange",
    defaultValues: moduleConfig.audio,
    resolver: classValidatorResolver(AudioValidation)
  });

  useEffect(() => {
    reset(moduleConfig.audio);
  }, [reset, moduleConfig.audio]);

  const onSubmit = handleSubmit((data) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig({
        payloadVariant: {
          case: "audio",
          value: data
        }
      })
    );
  });

  return (
    <Form onSubmit={onSubmit}>
      <Controller
        name="codec2Enabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Codec 2 Enabled"
            description="Enter a description."
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="PTT Pin"
        description="Enter a description."
        type="number"
        {...register("pttPin", { valueAsNumber: true })}
      />
      <Select
        label="Bitrate"
        description="Enter a description."
        {...register("bitrate", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.ModuleConfig_AudioConfig_Audio_Baud)}
      </Select>
      <Input
        label="i2SWs"
        description="Enter a description."
        type="number"
        {...register("i2sWs", { valueAsNumber: true })}
      />
      <Input
        label="i2SSd"
        description="Enter a description."
        type="number"
        {...register("i2sSd", { valueAsNumber: true })}
      />
      <Input
        label="i2SDin"
        description="Enter a description."
        type="number"
        {...register("i2sDin", { valueAsNumber: true })}
      />
      <Input
        label="i2SSck"
        description="Enter a description."
        type="number"
        {...register("i2sSck", { valueAsNumber: true })}
      />
    </Form>
  );
};
