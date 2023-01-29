import type React from "react";
import { useEffect } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "react-hot-toast";

import { BitwiseSelect } from "@app/components/form/BitwiseSelect.js";
import { FormSection } from "@app/components/form/FormSection.js";
import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { PositionValidation } from "@app/validation/config/position.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Position = (): JSX.Element => {
  const { config, nodes, hardware, setWorkingConfig } = useDevice();

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control
  } = useForm<PositionValidation>({
    mode: "onChange",
    defaultValues: {
      fixedAlt: myNode?.data.position?.altitude,
      fixedLat: (myNode?.data.position?.latitudeI ?? 0) / 1e7,
      fixedLng: (myNode?.data.position?.longitudeI ?? 0) / 1e7,
      ...config.position
    },
    resolver: classValidatorResolver(PositionValidation)
  });

  const fixedPositionEnabled = useWatch({
    control,
    name: "fixedPosition",
    defaultValue: false
  });

  useEffect(() => {
    reset({
      fixedAlt: myNode?.data.position?.altitude,
      fixedLat: (myNode?.data.position?.latitudeI ?? 0) / 1e7,
      fixedLng: (myNode?.data.position?.longitudeI ?? 0) / 1e7,
      ...config.position
    });
  }, [reset, config.position, myNode?.data.position]);

  const onSubmit = handleSubmit((data) => {
    const { fixedAlt, fixedLat, fixedLng, ...rest } = data;

    const configHasChanged = !Protobuf.Config_PositionConfig.equals(
      config.position,
      new Protobuf.Config_PositionConfig(rest)
    );

    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "position",
          value: rest
        }
      })
    );

    // if (connection) {
    //   void toast.promise(
    //     connection
    //       .setPosition(
    //         new Protobuf.Position({
    //           altitude: fixedAlt,
    //           latitudeI: fixedLat * 1e7,
    //           longitudeI: fixedLng * 1e7
    //         })
    //       )
    //       .then(() => reset({ ...data })),
    //     {
    //       loading: "Saving...",
    //       success: "Saved Position Config, Restarting Node",
    //       error: "No response received"
    //     }
    //   );
    //   if (configHasChanged) {
    //     void toast.promise(
    //       connection
    //         .setConfig(
    //           new Protobuf.Config({
    //             payloadVariant: {
    //               case: "position",
    //               value: rest
    //             }
    //           })
    //         )
    //         .then(() =>
    //           setConfig(
    //             new Protobuf.Config({
    //               payloadVariant: {
    //                 case: "position",
    //                 value: rest
    //               }
    //             })
    //           )
    //         ),
    //       {
    //         loading: "Saving...",
    //         success: "Saved Position Config, Restarting Node",
    //         error: "No response received"
    //       }
    //     );
    //   }
    // }
  });

  return (
    <Form onSubmit={onSubmit}>
      <Controller
        name="gpsEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="GPS Enabled"
            description="Enable the internal GPS module"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="positionBroadcastSmartEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Enable Smart Position"
            description="Only send position when there has been a meaningful change in location"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="positionFlags"
        control={control}
        render={({ field, fieldState }): JSX.Element => {
          const { value, onChange } = field;
          const { error } = fieldState;

          return (
            <BitwiseSelect
              label="Position Flags"
              description="Configuration options for POSITION messages"
              error={error?.message}
              selected={value}
              decodeEnun={Protobuf.Config_PositionConfig_PositionFlags}
              onChange={onChange}
            />
          );
        }}
      />
      <FormSection title="Fixed Position">
        <Controller
          name="fixedPosition"
          control={control}
          render={({ field: { value, ...rest } }) => (
            <Toggle
              label="Enabled"
              description="Don't report GPS position, but a manually-specified one"
              checked={value}
              {...rest}
            />
          )}
        />
        {fixedPositionEnabled && (
          <>
            <Input
              suffix="m"
              label="Altitude"
              type="number"
              error={errors.fixedAlt?.message}
              disabled={!fixedPositionEnabled}
              {...register("fixedAlt", { valueAsNumber: true })}
            />
            <Input
              suffix="°"
              label="Latitude"
              type="number"
              error={errors.fixedLat?.message}
              disabled={!fixedPositionEnabled}
              {...register("fixedLat", { valueAsNumber: true })}
            />
            <Input
              suffix="°"
              label="Longitude"
              type="number"
              error={errors.fixedLng?.message}
              disabled={!fixedPositionEnabled}
              {...register("fixedLng", { valueAsNumber: true })}
            />
          </>
        )}
      </FormSection>
      <FormSection title="Intervals">
        <Input
          suffix="Seconds"
          label="Broadcast Interval"
          description="How often your position is sent out over the mesh"
          type="number"
          error={errors.positionBroadcastSecs?.message}
          {...register("positionBroadcastSecs", { valueAsNumber: true })}
        />
        <Input
          suffix="Seconds"
          label="GPS Update Interval"
          description="How often a GPS fix should be acquired"
          type="number"
          error={errors.gpsUpdateInterval?.message}
          {...register("gpsUpdateInterval", { valueAsNumber: true })}
        />
        <Input
          suffix="Seconds"
          label="Fix Attempt Duration"
          description="How long the device will try to get a fix for"
          type="number"
          error={errors.gpsAttemptTime?.message}
          {...register("gpsAttemptTime", { valueAsNumber: true })}
        />
      </FormSection>
      <Input
        label="RX Pin"
        description="GPS Module RX pin override"
        type="number"
        error={errors.rxGpio?.message}
        {...register("rxGpio", { valueAsNumber: true })}
      />
      <Input
        label="TX Pin"
        description="GPS Module TX pin override"
        type="number"
        error={errors.txGpio?.message}
        {...register("txGpio", { valueAsNumber: true })}
      />
    </Form>
  );
};
