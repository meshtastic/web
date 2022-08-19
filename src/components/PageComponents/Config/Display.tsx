import type React from "react";
import { useEffect, useState } from "react";

import { FormField, SelectField, Switch, TextInputField } from "evergreen-ui";
import { Controller, useForm } from "react-hook-form";

import { DisplayValidation } from "@app/validation/config/display.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Display = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<Protobuf.Config_DisplayConfig>({
    defaultValues: config.display,
    resolver: classValidatorResolver(DisplayValidation),
  });

  useEffect(() => {
    reset(config.display);
  }, [reset, config.display]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "display",
          display: data,
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
      <TextInputField
        label="Screen Timeout"
        description="This is a description."
        hint="Seconds"
        type="number"
        {...register("screenOnSecs", { valueAsNumber: true })}
      />
      <TextInputField
        label="Carousel Delay"
        description="This is a description."
        hint="Seconds"
        type="number"
        {...register("autoScreenCarouselSecs", { valueAsNumber: true })}
      />
      <SelectField
        label="GPS Display Units"
        description="This is a description."
        {...register("gpsFormat", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DisplayConfig_GpsCoordinateFormat)}
      </SelectField>
      <FormField
        label="Compass North Top"
        description="Description"
        isInvalid={!!errors.compassNorthTop?.message}
        validationMessage={errors.compassNorthTop?.message}
      >
        <Controller
          name="compassNorthTop"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
    </Form>
  );
};
