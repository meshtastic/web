import type React from 'react';
import { useEffect, useState } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { FiSave } from 'react-icons/fi';
import { MultiSelect } from 'react-multi-select-component';

import { IconButton } from '@components/generic/button/IconButton';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Label } from '@components/generic/form/Label';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { bitwiseEncode } from '@core/utils/bitwise';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Position = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: {
        ...preferences,
        positionBroadcastSecs:
          preferences.positionBroadcastSecs === 0
            ? preferences.isRouter
              ? 43200
              : 900
            : preferences.positionBroadcastSecs,
      },
    });

  useEffect(() => {
    reset(preferences);
  }, [reset, preferences]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setPreferences(data, async () => {
      reset({ ...data });
      setLoading(false);
      await Promise.resolve();
    });
  });

  const encode = (enums: Protobuf.PositionFlags[]): number => {
    return enums.reduce((acc, curr) => acc | curr, 0);
  };

  const decode = (value: number): Protobuf.PositionFlags[] => {
    const enumValues = Object.keys(Protobuf.PositionFlags)
      .map(Number)
      .filter(Boolean);

    return enumValues.map((b) => value & b).filter(Boolean);
  };

  return (
    <>
      <form className="space-y-2" onSubmit={onSubmit}>
        <Input
          label="Broadcast Interval"
          type="number"
          suffix="Seconds"
          {...register('positionBroadcastSecs', { valueAsNumber: true })}
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
                  options={Object.entries(Protobuf.PositionFlags)
                    .filter((value) => typeof value[1] !== 'number')
                    .filter(
                      (value) =>
                        parseInt(value[0]) !==
                        Protobuf.PositionFlags.POS_UNDEFINED,
                    )
                    .map((value) => {
                      return {
                        value: parseInt(value[0]),
                        label: value[1].toString().replace('POS_', ''),
                      };
                    })}
                  value={decode(value).map((flag) => {
                    return {
                      value: flag,
                      label: Protobuf.PositionFlags[flag].replace('POS_', ''),
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

        <Input
          label="Position Type (DEBUG)"
          type="number"
          disabled
          {...register('positionFlags', { valueAsNumber: true })}
        />
        <Checkbox label="Use Fixed Position" {...register('fixedPosition')} />
        <Select
          label="Location Sharing"
          optionsEnum={Protobuf.LocationSharing}
          {...register('locationShare', { valueAsNumber: true })}
        />
        <Select
          label="GPS Mode"
          optionsEnum={Protobuf.GpsOperation}
          {...register('gpsOperation', { valueAsNumber: true })}
        />
        <Select
          label="Display Format"
          optionsEnum={Protobuf.GpsCoordinateFormat}
          {...register('gpsFormat', { valueAsNumber: true })}
        />
        <Checkbox label="Accept 2D Fix" {...register('gpsAccept2D')} />
        <Input
          label="Max DOP"
          type="number"
          {...register('gpsMaxDop', { valueAsNumber: true })}
        />
        <Input
          label="Last GPS Attempt"
          disabled
          {...register('gpsAttemptTime', { valueAsNumber: true })}
        />
      </form>
      <div className="flex w-full bg-white dark:bg-secondaryDark">
        <div className="ml-auto p-2">
          <IconButton
            disabled={!formState.isDirty}
            onClick={async (): Promise<void> => {
              await onSubmit();
            }}
            icon={<FiSave />}
          />
        </div>
      </div>
    </>
  );
};
