import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormSection } from "@components/form/FormSection.js";
import { Input } from "@components/form/Input.js";
import { Select } from "@components/form/Select.js";
import { Toggle } from "@components/form/Toggle.js";
import { LoRaValidation } from "@app/validation/config/lora.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const LoRa = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const { register, handleSubmit, control, reset } = useForm<LoRaValidation>({
    mode: "onChange",
    defaultValues: config.lora,
    resolver: classValidatorResolver(LoRaValidation)
  });

  const usePreset = useWatch({
    control,
    name: "usePreset",
    defaultValue: true
  });

  useEffect(() => {
    reset(config.lora);
  }, [reset, config.lora]);

  const onSubmit = handleSubmit((data) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "lora",
          value: data
        }
      })
    );
  });

  return (
    <Form onSubmit={onSubmit}>
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
        {usePreset ? (
          <Select
            label="Preset"
            description="Modem preset to use"
            {...register("modemPreset", { valueAsNumber: true })}
          >
            {renderOptions(Protobuf.Config_LoRaConfig_ModemPreset)}
          </Select>
        ) : (
          <>
            <Input
              label="Bandwidth"
              description="Channel bandwidth in MHz"
              type="number"
              suffix="MHz"
              {...register("bandwidth", {
                valueAsNumber: true
              })}
            />
            <Input
              label="Spread Factor"
              description="Indicates the number of chirps per symbol"
              type="number"
              suffix="CPS"
              {...register("spreadFactor", {
                valueAsNumber: true
              })}
            />
            <Input
              label="Coding Rate"
              description="The denominator of the coding rate"
              type="number"
              {...register("codingRate", {
                valueAsNumber: true
              })}
            />
          </>
        )}
      </FormSection>
      <FormSection title="Radio Settings">
        <Controller
          name="txEnabled"
          control={control}
          render={({ field: { value, ...rest } }) => (
            <Toggle
              label="Transmit Enabled"
              description="Enable/Disable transmit (TX) from the LoRa radio"
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
          {...register("txPower", { valueAsNumber: true })}
        />
        <Input
          label="Channel Number"
          description="LoRa channel number"
          type="number"
          {...register("channelNum", { valueAsNumber: true })}
        />
        <Input
          label="Frequency Offset"
          description="Frequency offset to correct for crystal calibration errors"
          suffix="Hz"
          type="number"
          {...register("frequencyOffset", { valueAsNumber: true })}
        />
        <Controller
          name="overrideDutyCycle"
          control={control}
          render={({ field: { value, ...rest } }) => (
            <Toggle
              label="Override Duty Cycle"
              description="Description"
              checked={value}
              {...rest}
            />
          )}
        />
      </FormSection>
      <Input
        label="Hop Limit"
        description="Maximum number of hops"
        suffix="Hops"
        type="number"
        {...register("hopLimit", { valueAsNumber: true })}
      />
    </Form>
  );
};
