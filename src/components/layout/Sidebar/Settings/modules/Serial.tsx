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

  const serialConfig = useAppSelector(
    (state) => state.meshtastic.radio.moduleConfig.serial,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.ModuleConfig_SerialConfig>({
      defaultValues: serialConfig,
    });

  useEffect(() => {
    reset(serialConfig);
  }, [reset, serialConfig]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: 'serial',
          serial: data,
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
      <Checkbox label="Echo" disabled={!moduleEnabled} {...register('echo')} />

      <Input
        type="number"
        label="RX"
        disabled={!moduleEnabled}
        {...register('rxd', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="TX Pin"
        disabled={!moduleEnabled}
        {...register('txd', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Baud Rate"
        disabled={!moduleEnabled}
        {...register('baud', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Timeout"
        disabled={!moduleEnabled}
        {...register('timeout', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Mode"
        disabled={!moduleEnabled}
        {...register('mode', {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
