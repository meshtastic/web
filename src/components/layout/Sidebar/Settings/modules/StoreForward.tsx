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

  const storeForwardConfig = useAppSelector(
    (state) => state.meshtastic.radio.moduleConfig.storeForward,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.ModuleConfig_StoreForwardConfig>({
      defaultValues: storeForwardConfig,
    });

  useEffect(() => {
    reset(storeForwardConfig);
  }, [reset, storeForwardConfig]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: 'storeForward',
          storeForward: data,
        },
      },
      async (): Promise<void> => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      },
    );
  });

  const moduleEnabled = useWatch({
    control,
    name: 'enabled',
    defaultValue: false,
  });

  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Checkbox label="Module Enabled" {...register('enabled')} />
      <Checkbox
        label="Heartbeat Enabled"
        disabled={!moduleEnabled}
        {...register('heartbeat')}
      />
      <Input
        type="number"
        label="Number of records"
        suffix="Records"
        disabled={!moduleEnabled}
        {...register('records', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="History return max"
        disabled={!moduleEnabled}
        {...register('historyReturnMax', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="History return window"
        disabled={!moduleEnabled}
        {...register('historyReturnWindow', {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
