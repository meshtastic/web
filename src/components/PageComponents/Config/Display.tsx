import type React from "react";
import { useEffect, useState } from "react";

import { Controller, useForm } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Select } from "@app/components/form/Select.js";
import { Toggle } from "@app/components/form/Toggle.js";
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
    <Form
      title="Display Config"
      breadcrumbs={["Config", "Display"]}
      reset={() => reset(config.display)}
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Input
        label="Screen Timeout"
        description="This is a description."
        suffix="Seconds"
        type="number"
        {...register("screenOnSecs", { valueAsNumber: true })}
      />
      <Input
        label="Carousel Delay"
        description="This is a description."
        suffix="Seconds"
        type="number"
        {...register("autoScreenCarouselSecs", { valueAsNumber: true })}
      />
      <Select
        label="GPS Display Units"
        description="This is a description."
        {...register("gpsFormat", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DisplayConfig_GpsCoordinateFormat)}
      </Select>
      <Controller
        name="compassNorthTop"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Compass North Top"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="flipScreen"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Flip Screen"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Select
        label="Display Units"
        description="This is a description."
        {...register("units", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DisplayConfig_DisplayUnits)}
      </Select>
    </Form>
  );
};
