import type React from "react";
import { useEffect, useState } from "react";

import {
  Button,
  FormField,
  SelectMenu,
  Switch,
  TextInputField,
} from "evergreen-ui";
import { Controller, useForm } from "react-hook-form";

import { PositionValidation } from "@app/validation/config/position.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { bitwiseDecode } from "@core/utils/bitwise";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Position = (): JSX.Element => {
  const { config, connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<PositionValidation>({
    defaultValues: config.position,
    resolver: classValidatorResolver(PositionValidation),
    // defaultValues: {
    //   ...preferences,
    //   positionBroadcastSecs:
    //     preferences.positionBroadcastSecs === 0
    //       ? preferences.role === Protobuf.Role.Router
    //         ? 43200
    //         : 900
    //       : preferences.positionBroadcastSecs,
    // },
  });

  useEffect(() => {
    reset(config.position);
  }, [reset, config.position]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection?.setConfig(
      {
        payloadVariant: {
          oneofKind: "position",
          position: data,
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
        hint="Seconds"
        label="Broadcast Interval"
        description="This is a description."
        type="number"
        isInvalid={!!errors.positionBroadcastSecs?.message}
        validationMessage={errors.positionBroadcastSecs?.message}
        {...register("positionBroadcastSecs", { valueAsNumber: true })}
      />
      <FormField
        label="Disable Smart Position"
        description="Description"
        isInvalid={!!errors.positionBroadcastSmartDisabled?.message}
        validationMessage={errors.positionBroadcastSmartDisabled?.message}
      >
        <Controller
          name="positionBroadcastSmartDisabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Use Fixed Position"
        description="Description"
        isInvalid={!!errors.fixedPosition?.message}
        validationMessage={errors.fixedPosition?.message}
      >
        <Controller
          name="fixedPosition"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Disable GPS"
        description="Description"
        isInvalid={!!errors.gpsDisabled?.message}
        validationMessage={errors.gpsDisabled?.message}
      >
        <Controller
          name="gpsDisabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <TextInputField
        hint="Seconds"
        label="GPS Update Interval"
        description="This is a description."
        type="number"
        isInvalid={!!errors.gpsUpdateInterval?.message}
        validationMessage={errors.gpsUpdateInterval?.message}
        {...register("gpsUpdateInterval", { valueAsNumber: true })}
      />
      <TextInputField
        label="Last GPS Attempt"
        description="This is a description."
        type="number"
        isInvalid={!!errors.gpsAttemptTime?.message}
        validationMessage={errors.gpsAttemptTime?.message}
        {...register("gpsAttemptTime", { valueAsNumber: true })}
      />
      <Controller
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
      />
    </Form>
  );
};
