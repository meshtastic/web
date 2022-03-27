import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export const SerialSettingsPanel = (): JSX.Element => {
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
    name: 'serialModuleEnabled',
    defaultValue: false,
  });

  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Checkbox label="Module Enabled" {...register('serialModuleEnabled')} />
      <Checkbox
        label="Echo"
        disabled={!moduleEnabled}
        {...register('serialModuleEcho')}
      />

      <Input
        type="number"
        label="RX"
        disabled={!moduleEnabled}
        {...register('serialModuleRxd', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="TX Pin"
        disabled={!moduleEnabled}
        {...register('serialModuleTxd', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Baud Rate"
        disabled={!moduleEnabled}
        {...register('serialModuleBaud', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Timeout"
        disabled={!moduleEnabled}
        {...register('serialModuleTimeout', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Mode"
        disabled={!moduleEnabled}
        {...register('serialModuleMode', {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
