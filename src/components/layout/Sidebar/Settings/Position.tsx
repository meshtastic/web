import type React from 'react';
import { useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { MultiSelect } from 'react-multi-select-component';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { Label } from '@components/generic/form/Label';
import { connection } from '@core/connection';
import { bitwiseDecode, bitwiseEncode } from '@core/utils/bitwise';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Position = (): JSX.Element => {
  const positionConfig = useAppSelector(
    (state) => state.meshtastic.radio.config.position,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.Config_PositionConfig>({
      defaultValues: positionConfig,
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
    reset(positionConfig);
  }, [reset, positionConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setConfig(
      {
        payloadVariant: {
          oneofKind: 'position',
          position: data,
        },
      },
      async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      },
    );
  });

  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Input
        label="Broadcast Interval"
        type="number"
        suffix="Seconds"
        {...register('positionBroadcastSecs', { valueAsNumber: true })}
      />
      <Checkbox
        label="Disable Smart Position"
        {...register('positionBroadcastSmartDisabled')}
      />
      <Checkbox label="Use Fixed Position" {...register('fixedPosition')} />
      <Checkbox
        label="Disable Location Sharing"
        {...register('locationShareDisabled')}
      />
      <Checkbox label="Disable GPS" {...register('gpsDisabled')} />
      <Input
        label="GPS Update Interval"
        type="number"
        suffix="Seconds"
        {...register('gpsUpdateInterval', { valueAsNumber: true })}
      />
      <Input
        label="Last GPS Attempt"
        disabled
        {...register('gpsAttemptTime', { valueAsNumber: true })}
      />
      <Checkbox label="Accept 2D Fix" {...register('gpsAccept2D')} />
      <Input
        label="Max DOP"
        type="number"
        {...register('gpsMaxDop', { valueAsNumber: true })}
      />
      <Controller
        name="positionFlags"
        control={control}
        render={({ field, fieldState }): JSX.Element => {
          const { value, onChange, ...rest } = field;
          const { error } = fieldState;
          const label = 'Position Flags';
          return (
            <div className="w-full">
              {label && <Label label={label} error={error?.message} />}
              <MultiSelect
                options={Object.entries(
                  Protobuf.Config_PositionConfig_PositionFlags,
                )
                  .filter((value) => typeof value[1] !== 'number')
                  .filter(
                    (value) =>
                      parseInt(value[0]) !==
                      Protobuf.Config_PositionConfig_PositionFlags
                        .POS_UNDEFINED,
                  )
                  .map((value) => {
                    return {
                      value: parseInt(value[0]),
                      label: value[1].toString().replace('POS_', ''),
                    };
                  })}
                value={bitwiseDecode(
                  value,
                  Protobuf.Config_PositionConfig_PositionFlags,
                ).map((flag) => {
                  return {
                    value: flag,
                    label: Protobuf.Config_PositionConfig_PositionFlags[
                      flag
                    ].replace('POS_', ''),
                  };
                })}
                onChange={(e: { value: number; label: string }[]): void =>
                  onChange(bitwiseEncode(e.map((v) => v.value)))
                }
                labelledBy="Select"
              />
            </div>
          );
        }}
      />
    </Form>
  );
};
