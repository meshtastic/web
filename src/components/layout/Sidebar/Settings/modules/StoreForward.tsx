import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export const StoreForwardSettingsPanel = (): JSX.Element => {
  const [loading, setLoading] = useState(false);

  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  useEffect(() => {
    reset(preferences);
  }, [reset, preferences]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection.setPreferences(data, async (): Promise<void> => {
      reset({ ...data });
      setLoading(false);
      await Promise.resolve();
    });
  });

  const moduleEnabled = useWatch({
    control,
    name: 'storeForwardModuleEnabled',
    defaultValue: false,
  });

  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Checkbox
        label="Module Enabled"
        {...register('storeForwardModuleEnabled')}
      />
      <Checkbox
        label="Heartbeat Enabled"
        disabled={!moduleEnabled}
        {...register('storeForwardModuleHeartbeat')}
      />
      <Input
        type="number"
        label="Number of records"
        suffix="Records"
        disabled={!moduleEnabled}
        {...register('storeForwardModuleRecords', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="History return max"
        disabled={!moduleEnabled}
        {...register('storeForwardModuleHistoryReturnMax', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="History return window"
        disabled={!moduleEnabled}
        {...register('storeForwardModuleHistoryReturnWindow', {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
