import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export const MQTT = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  const moduleEnabled = useWatch({
    control,
    name: 'mqttDisabled',
    defaultValue: false,
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
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Checkbox label="Module Disabled" {...register('mqttDisabled')} />
      <Input
        label="MQTT Server Address"
        disabled={moduleEnabled}
        {...register('mqttServer')}
      />
      <Input
        label="MQTT Username"
        disabled={moduleEnabled}
        {...register('mqttUsername')}
      />
      <Input
        label="MQTT Password"
        type="password"
        autoComplete="off"
        disabled={moduleEnabled}
        {...register('mqttPassword')}
      />
      <Checkbox
        label="Encryption Enabled"
        disabled={moduleEnabled}
        {...register('mqttEncryptionEnabled')}
      />
    </Form>
  );
};
