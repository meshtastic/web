import type React from "react";
import { useEffect, useState } from "react";

import { FormField, SelectField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm } from "react-hook-form";

import { LoRaValidation } from "@app/validation/config/lora.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const LoRa = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const [usePreset, setUsePreset] = useState(true);

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
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      <FormField
        label="Use Preset"
        description="Description"
        isInvalid={!!errors.txDisabled?.message}
        validationMessage={errors.txDisabled?.message}
      >
        <Switch
          height={24}
          marginLeft="auto"
          checked={usePreset}
          onChange={(e) => setUsePreset(e.target.checked)}
        />
      </FormField>
      <SelectField
        display={usePreset ? "block" : "none"}
        label="Preset"
        description="This is a description."
        isInvalid={!!errors.modemPreset?.message}
        validationMessage={errors.modemPreset?.message}
        {...register("modemPreset", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_LoRaConfig_ModemPreset)}
      </SelectField>

      <TextInputField
        display={usePreset ? "none" : "block"}
        label="Bandwidth"
        description="Max transmit power in dBm"
        type="number"
        hint="MHz"
        isInvalid={!!errors.bandwidth?.message}
        validationMessage={errors.bandwidth?.message}
        {...register("bandwidth", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        display={usePreset ? "none" : "block"}
        label="Spread Factor"
        description="Max transmit power in dBm"
        type="number"
        hint="CPS"
        isInvalid={!!errors.spreadFactor?.message}
        validationMessage={errors.spreadFactor?.message}
        {...register("spreadFactor", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        display={usePreset ? "none" : "block"}
        label="Coding Rate"
        description="Max transmit power in dBm"
        type="number"
        isInvalid={!!errors.codingRate?.message}
        validationMessage={errors.codingRate?.message}
        {...register("codingRate", {
          valueAsNumber: true,
        })}
      />
      <TextInputField
        label="Transmit Power"
        description="Max transmit power in dBm"
        type="number"
        isInvalid={!!errors.txPower?.message}
        validationMessage={errors.txPower?.message}
        {...register("txPower", { valueAsNumber: true })}
      />
      <TextInputField
        label="Hop Count"
        description="This is a description."
        hint="Hops"
        type="number"
        isInvalid={!!errors.hopLimit?.message}
        validationMessage={errors.hopLimit?.message}
        {...register("hopLimit", { valueAsNumber: true })}
      />
      <FormField
        label="Transmit Disabled"
        description="Description"
        isInvalid={!!errors.txDisabled?.message}
        validationMessage={errors.txDisabled?.message}
      >
        <Controller
          name="txDisabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        label="Frequency Offset"
        description="This is a description."
        hint="Hz"
        type="number"
        isInvalid={!!errors.frequencyOffset?.message}
        validationMessage={errors.frequencyOffset?.message}
        {...register("frequencyOffset", { valueAsNumber: true })}
      />
      <SelectField
        label="Region"
        description="This is a description."
        isInvalid={!!errors.region?.message}
        validationMessage={errors.region?.message}
        {...register("region", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_LoRaConfig_RegionCode)}
      </SelectField>
    </Form>
  );
};
