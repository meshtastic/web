import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { FiSave } from 'react-icons/fi';

import { IconButton } from '@components/generic/button/IconButton';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Power = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: {
        ...preferences,
        isLowPower: preferences.isRouter ? true : preferences.isLowPower,
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
  return (
    <>
      <form className="space-y-2" onSubmit={onSubmit}>
        <Select
          label="Charge current"
          optionsEnum={Protobuf.ChargeCurrent}
          {...register('chargeCurrent', { valueAsNumber: true })}
        />
        <Checkbox label="Always powered" {...register('isAlwaysPowered')} />
        <Checkbox
          label="Powered by low power source (solar)"
          disabled={preferences.isRouter}
          validationMessage={
            preferences.isRouter ? 'Enabled by default in router mode' : ''
          }
          {...register('isLowPower')}
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
