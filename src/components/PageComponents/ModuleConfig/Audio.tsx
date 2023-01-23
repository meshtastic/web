import type React from "react";
import { useEffect } from "react";

import { Controller, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

import { Input } from "@app/components/form/Input.js";
import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { AudioValidation } from "@app/validation/moduleConfig/audio.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Audio = (): JSX.Element => {
  const { moduleConfig, connection, setModuleConfig } = useDevice();
  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    control
  } = useForm<AudioValidation>({
    defaultValues: moduleConfig.audio,
    resolver: classValidatorResolver(AudioValidation)
  });

  useEffect(() => {
    reset(moduleConfig.audio);
  }, [reset, moduleConfig.audio]);

  const onSubmit = handleSubmit((data) => {
    if (connection) {
      void toast.promise(
        connection
          .setModuleConfig(
            new Protobuf.ModuleConfig({
              payloadVariant: {
                case: "audio",
                value: data
              }
            })
          )
          .then(() =>
            setModuleConfig(
              new Protobuf.ModuleConfig({
                payloadVariant: {
                  case: "audio",
                  value: data
                }
              })
            )
          ),
        {
          loading: "Saving...",
          success: "Saved Audio Config, Restarting Node",
          error: "No response received"
        }
      );
    }
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
