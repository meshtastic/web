import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { LoRaValidation } from "@app/validation/config/lora.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const LoRa = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
    reset,
  } = useForm<LoRaValidation>({
    defaultValues: config.lora,
    resolver: classValidatorResolver(LoRaValidation),
  });

  const usePreset = useWatch({
    control,
    name: "usePreset",
    defaultValue: true,
  });

  useEffect(() => {
    reset(config.lora);
  }, [reset, config.lora]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "lora",
          lora: data,
        },
      },
      async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      }
    );
  });

  return (
    <Form
      title="LoRa Config"
      breadcrumbs={["Config", "LoRa"]}
      reset={() => reset(config.lora)}
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Controller
        name="usePreset"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Use Preset"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Select
        label="Preset"
        description="This is a description."
        disabled={!usePreset}
        {...register("modemPreset", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_LoRaConfig_ModemPreset)}
      </Select>

      <Input
        label="Bandwidth"
        description="Max transmit power in dBm"
        type="number"
        suffix="MHz"
        error={errors.bandwidth?.message}
        {...register("bandwidth", {
          valueAsNumber: true,
        })}
        disabled={usePreset}
      />
      <Input
        label="Spread Factor"
        description="Max transmit power in dBm"
        type="number"
        suffix="CPS"
        error={errors.spreadFactor?.message}
        {...register("spreadFactor", {
          valueAsNumber: true,
        })}
        disabled={usePreset}
      />
      <Input
        label="Coding Rate"
        description="Max transmit power in dBm"
        type="number"
        error={errors.codingRate?.message}
        {...register("codingRate", {
          valueAsNumber: true,
        })}
        disabled={usePreset}
      />
      <Input
        label="Frequency Offset"
        description="This is a description."
        suffix="Hz"
        type="number"
        error={errors.frequencyOffset?.message}
        {...register("frequencyOffset", { valueAsNumber: true })}
      />
      <Select
        label="Region"
        description="This is a description."
        {...register("region", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_LoRaConfig_RegionCode)}
      </Select>
      <Input
        label="Hop Limit"
        description="This is a description."
        suffix="Hops"
        type="number"
        error={errors.hopLimit?.message}
        {...register("hopLimit", { valueAsNumber: true })}
      />
      <Controller
        name="txEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Transmit Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Input
        label="Transmit Power"
        description="Max transmit power in dBm"
        type="number"
        error={errors.txPower?.message}
        {...register("txPower", { valueAsNumber: true })}
      />
    </Form>
  );
};
