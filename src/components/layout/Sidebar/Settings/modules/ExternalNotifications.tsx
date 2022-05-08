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

  const extNotificationConfig = useAppSelector(
    (state) => state.meshtastic.radio.moduleConfig.extNotification,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.ModuleConfig_ExternalNotificationConfig>({
      defaultValues: extNotificationConfig,
    });

  useEffect(() => {
    reset(extNotificationConfig);
  }, [reset, extNotificationConfig]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: 'externalNotification',
          externalNotification: data,
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
      <Input
        type="number"
        label="Output MS"
        suffix="ms"
        disabled={!moduleEnabled}
        {...register('outputMs', {
          valueAsNumber: true,
        })}
      />
      <Input
        type="number"
        label="Output"
        disabled={!moduleEnabled}
        {...register('output', {
          valueAsNumber: true,
        })}
      />
      <Checkbox
        label="Active"
        disabled={!moduleEnabled}
        {...register('active')}
      />
      <Checkbox
        label="Message"
        disabled={!moduleEnabled}
        {...register('alertMessage')}
      />
      <Checkbox
        label="Bell"
        disabled={!moduleEnabled}
        {...register('alertBell')}
      />
    </Form>
  );
};
