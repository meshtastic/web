import type React from "react";
import { useEffect } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "react-hot-toast";

import { FormSection } from "@app/components/form/FormSection.js";
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
    if (connection) {
      void toast.promise(
        connection.setConfig(
          {
            payloadVariant: {
              oneofKind: "lora",
              lora: data,
            },
          },
          async () => {
            reset({ ...data });
            await Promise.resolve();
          }
        ),
        {
          loading: "Saving...",
          success: "Saved LoRa Config, Restarting Node",
          error: "No response received",
        }
      );
    }
  });

  return (
    <Form
      title="LoRa Config"
      breadcrumbs={["Config", "LoRa"]}
      reset={() => reset(config.lora)}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <FormSection title="Modem Settings">
        <Controller
          name="usePreset"
          control={control}
          render={({ field: { value, ...rest } }) => (
            <Toggle
              label="Use Preset"
              description="Use one of the predefined modem presets"
              checked={value}
              {...rest}
            />
          )}
        />
        <Select
          label="Preset"
          description="Modem preset to use"
          disabled={!usePreset}
          {...register("modemPreset", { valueAsNumber: true })}
        >
          {renderOptions(Protobuf.Config_LoRaConfig_ModemPreset)}
        </Select>
        <Input
          label="Bandwidth"
          description="Channel bandwidth in MHz"
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
          description="Indicates the number of chirps per symbol"
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
          description="The denominator of the coding rate"
          type="number"
          error={errors.codingRate?.message}
          {...register("codingRate", {
            valueAsNumber: true,
          })}
          disabled={usePreset}
        />
      </FormSection>
      <FormSection title="Radio Settings">
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
        <Select
          label="Region"
          description="Sets the region for your node"
          {...register("region", { valueAsNumber: true })}
        >
          {renderOptions(Protobuf.Config_LoRaConfig_RegionCode)}
        </Select>
        <Input
          label="Transmit Power"
          description="Max transmit power in dBm"
          type="number"
          error={errors.txPower?.message}
          {...register("txPower", { valueAsNumber: true })}
        />
        <Input
          label="Channel Number"
          description="LoRa channel number"
          type="number"
          error={errors.channelNum?.message}
          {...register("channelNum", { valueAsNumber: true })}
        />
        <Input
          label="Frequency Offset"
          description="Frequency offset to correct for crystal calibration errors"
          suffix="Hz"
          type="number"
          error={errors.frequencyOffset?.message}
          {...register("frequencyOffset", { valueAsNumber: true })}
        />
      </FormSection>
      <Input
        label="Hop Limit"
        description="Maximum number of hops"
        suffix="Hops"
        type="number"
        error={errors.hopLimit?.message}
        {...register("hopLimit", { valueAsNumber: true })}
      />
    </Form>
  );
};
