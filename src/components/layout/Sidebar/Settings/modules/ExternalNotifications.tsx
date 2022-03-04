import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export const ExternalNotificationsSettingsPlanel = (): JSX.Element => {
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
    name: 'extNotificationModuleEnabled',
    defaultValue: false,
  });

  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Checkbox
        label="Module Enabled"
        {...register('extNotificationModuleEnabled')}
      />
      <Input
        type="number"
        label="Output MS"
        suffix="ms"
        disabled={!moduleEnabled}
        {...register('extNotificationModuleOutputMs', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Output"
        disabled={!moduleEnabled}
        {...register('extNotificationModuleOutput', {
          valueAsNumber: true,
        })}
      />
      <Checkbox
        label="Active"
        disabled={!moduleEnabled}
        {...register('extNotificationModuleActive')}
      />
      <Checkbox
        label="Message"
        disabled={!moduleEnabled}
        {...register('extNotificationModuleAlertMessage')}
      />
      <Checkbox
        label="Bell"
        disabled={!moduleEnabled}
        {...register('extNotificationModuleAlertBell')}
      />
    </Form>
  );
};
