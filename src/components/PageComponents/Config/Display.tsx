import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@components/form/Input.js";
import { Select } from "@components/form/Select.js";
import { Toggle } from "@components/form/Toggle.js";
import { DisplayValidation } from "@app/validation/config/display.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { renderOptions } from "@core/utils/selectEnumOptions.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Display = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { register, handleSubmit, reset, control } = useForm<DisplayValidation>(
    {
      mode: "onChange",
      defaultValues: config.display,
      resolver: classValidatorResolver(DisplayValidation)
    }
  );

  useEffect(() => {
    reset(config.display);
  }, [reset, config.display]);

  const onSubmit = handleSubmit((data) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "display",
          value: data
        }
      })
    );
  });

  return (
    <Form onSubmit={onSubmit}>
      <Input
        label="Screen Timeout"
        description="Turn off the display after this long"
        suffix="Seconds"
        type="number"
        {...register("screenOnSecs", { valueAsNumber: true })}
      />
      <Input
        label="Carousel Delay"
        description="How fast to cycle through windows"
        suffix="Seconds"
        type="number"
        {...register("autoScreenCarouselSecs", { valueAsNumber: true })}
      />
      <Select
        label="GPS Display Units"
        description="Coordinate display format"
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
            description="Fix north to the top of compass"
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
            description="Flip display 180 degrees"
            checked={value}
            {...rest}
          />
        )}
      />
      <Select
        label="Display Units"
        description="Display metric or imperial units"
        {...register("units", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DisplayConfig_DisplayUnits)}
      </Select>
      <Select
        label="OLED Type"
        description="Type of OLED screen attached to the device"
        {...register("oled", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DisplayConfig_OledType)}
      </Select>
      <Select
        label="Display Mode"
        description="Screen layout variant"
        {...register("displaymode", { valueAsNumber: true })}
      >
        {renderOptions(Protobuf.Config_DisplayConfig_DisplayMode)}
      </Select>
      <Controller
        name="headingBold"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Bold Heading"
            description="Bolden the heading text"
            checked={value}
            {...rest}
          />
        )}
      />
    </Form>
  );
};
