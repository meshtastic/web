import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { FiSave } from 'react-icons/fi';

import { IconButton } from '@components/generic/button/IconButton';
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

  const pluginEnabled = useWatch({
    control,
    name: 'storeForwardPluginEnabled',
    defaultValue: false,
  });

  return (
    <>
      <Form loading={loading}>
        <Checkbox
          label="Plugin Enabled"
          {...register('storeForwardPluginEnabled')}
        />
        <Checkbox
          label="Heartbeat Enabled"
          disabled={!pluginEnabled}
          {...register('storeForwardPluginHeartbeat')}
        />
        <Input
          type="number"
          label="Number of records"
          suffix="Records"
          disabled={!pluginEnabled}
          {...register('storeForwardPluginRecords', {
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          label="History return max"
          disabled={!pluginEnabled}
          {...register('storeForwardPluginHistoryReturnMax', {
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          label="History return window"
          disabled={!pluginEnabled}
          {...register('storeForwardPluginHistoryReturnWindow', {
            valueAsNumber: true,
          })}
        />
      </Form>
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
