import type React from "react";
import { useEffect } from "react";

import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "react-hot-toast";

import { FormSection } from "@app/components/form/FormSection.js";
import { Input } from "@app/components/form/Input.js";
import { Toggle } from "@app/components/form/Toggle.js";
import { PositionValidation } from "@app/validation/config/position.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Position = (): JSX.Element => {
  const { config, connection, nodes, hardware } = useDevice();

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<PositionValidation>({
    defaultValues: {
      fixedAlt: myNode?.data.position?.altitude,
      fixedLat: (myNode?.data.position?.latitudeI ?? 0) / 1e7,
      fixedLng: (myNode?.data.position?.longitudeI ?? 0) / 1e7,
      ...config.position,
    },
    resolver: classValidatorResolver(PositionValidation),
  });

  const fixedPositionEnabled = useWatch({
    control,
    name: "fixedPosition",
    defaultValue: false,
  });

  useEffect(() => {
    reset({
      fixedAlt: myNode?.data.position?.altitude,
      fixedLat: (myNode?.data.position?.latitudeI ?? 0) / 1e7,
      fixedLng: (myNode?.data.position?.longitudeI ?? 0) / 1e7,
      ...config.position,
    });
  }, [reset, config.position, myNode?.data.position]);

  const onSubmit = handleSubmit((data) => {
    const { fixedAlt, fixedLat, fixedLng, ...rest } = data;

    const configHasChanged = !Protobuf.Config_PositionConfig.equals(
      config.position,
      Protobuf.Config_PositionConfig.create(rest)
    );

    if (connection) {
      void toast.promise(
        connection.sendPacket(
          Protobuf.Position.toBinary(
            Protobuf.Position.create({
              altitude: fixedAlt,
              latitudeI: fixedLat * 1e7,
              longitudeI: fixedLng * 1e7,
            })
          ),
          Protobuf.PortNum.POSITION_APP,
          undefined,
          true,
          undefined,
          true,
          false,
          async () => {
            reset({ ...data });
            await Promise.resolve();
          }
        ),
        {
          loading: "Saving...",
          success: "Saved Channel",
          error: "No response received",
        }
      );
      if (configHasChanged) {
        void toast.promise(
          connection.setConfig(
            {
              payloadVariant: {
                oneofKind: "position",
                position: rest,
              },
            },
            async () => {
              reset({ ...data });
              await Promise.resolve();
            }
          ),
          {
            loading: "Saving...",
            success: "Saved Position Config, Restarting Node",
            error: "No response received",
          }
        );
      }
    }
  });

  return (
    <Form
      title="Position Config"
      breadcrumbs={["Config", "Position"]}
      reset={() => reset(config.position)}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      <Input
        suffix="Seconds"
        label="Broadcast Interval"
        description="How often your position is sent out over the mesh"
        type="number"
        error={errors.positionBroadcastSecs?.message}
        {...register("positionBroadcastSecs", { valueAsNumber: true })}
      />
      <Controller
        name="positionBroadcastSmartEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Enable Smart Position"
            description="Only send position when there has been a meaningfull change in location"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="fixedPosition"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Use Fixed Position"
            description="Don't report GPS position, but a manually specified one"
            checked={value}
            {...rest}
          />
        )}
      />
      <FormSection title="Fixed Position">
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
      </FormSection>
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
      <Input
        suffix="Seconds"
        label="GPS Update Interval"
        description="How often a GPS fix should be acquired"
        type="number"
        error={errors.gpsUpdateInterval?.message}
        {...register("gpsUpdateInterval", { valueAsNumber: true })}
      />
      <Input
        label="Fix Attempt Duration"
        description="How long the device will try to get a fix for"
        type="number"
        error={errors.gpsAttemptTime?.message}
        {...register("gpsAttemptTime", { valueAsNumber: true })}
      />
      {/* <Controller
        name="positionFlags"
        control={control}
        render={({ field, fieldState }): JSX.Element => {
          const { value, onChange, ...rest } = field;
          const { error } = fieldState;
          const options = Object.entries(
            Protobuf.Config_PositionConfig_PositionFlags
          )
            .filter((value) => typeof value[1] !== "number")
            .filter(
              (value) =>
                parseInt(value[0]) !==
                Protobuf.Config_PositionConfig_PositionFlags.UNSET
            )
            .map((value) => {
              return {
                value: parseInt(value[0]),
                label: value[1].toString().replace("POS_", "").toLowerCase(),
              };
            });

          const selected = bitwiseDecode(
            value,
            Protobuf.Config_PositionConfig_PositionFlags
          ).map((flag) =>
            Protobuf.Config_PositionConfig_PositionFlags[flag]
              .replace("POS_", "")
              .toLowerCase()
          );
          //   onChange={(e: { value: number; label: string }[]): void =>
          //   onChange(bitwiseEncode(e.map((v) => v.value)))
          // }
          return (
            <FormField
              label="Position Flags"
              description="Description"
              isInvalid={!!errors.positionFlags?.message}
              validationMessage={errors.positionFlags?.message}
            >
              <SelectMenu
                isMultiSelect
                title="Select multiple names"
                options={options}
                selected={selected}
                // onSelect={(item) => {
                //     const selected = [...selectedItemsState, item.value]
                //     const selectedItems = selected
                //     const selectedItemsLength = selectedItems.length
                //     let selectedNames = ''
                //     if (selectedItemsLength === 0) {
                //     selectedNames = ''
                //     } else if (selectedItemsLength === 1) {
                //     selectedNames = selectedItems.toString()
                //     } else if (selectedItemsLength > 1) {
                //     selectedNames = selectedItemsLength.toString() + ' selected...'
                //     }
                //     setSelectedItems(selectedItems)
                //     setSelectedItemNames(selectedNames)
                // }}
                // onDeselect={(item) => {
                //     const deselectedItemIndex = selectedItemsState.indexOf(item.value)
                //     const selectedItems = selectedItemsState.filter((_item, i) => i !== deselectedItemIndex)
                //     const selectedItemsLength = selectedItems.length
                //     let selectedNames = ''
                //     if (selectedItemsLength === 0) {
                //     selectedNames = ''
                //     } else if (selectedItemsLength === 1) {
                //     selectedNames = selectedItems.toString()
                //     } else if (selectedItemsLength > 1) {
                //     selectedNames = selectedItemsLength.toString() + ' selected...'
                //     }

                //     setSelectedItems(selectedItems)
                //     setSelectedItemNames(selectedNames)
                // }}
              >
                <Button>
                  {selected.map(
                    (item, index) =>
                      `${item}${index !== selected.length - 1 ? ", " : ""}`
                  )}
                </Button>
              </SelectMenu>
            </FormField>
          );
        }}
      /> */}
    </Form>
  );
};
