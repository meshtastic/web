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
  const mqttConfig = useAppSelector(
    (state) => state.meshtastic.radio.moduleConfig.mqtt,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.ModuleConfig_MQTTConfig>({
      defaultValues: mqttConfig,
    });

  const moduleEnabled = useWatch({
    control,
    name: 'disabled',
    defaultValue: false,
  });

  useEffect(() => {
    reset(mqttConfig);
  }, [reset, mqttConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: 'mqtt',
          mqtt: data,
        },
      },
      async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      },
    );
  });
  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Checkbox label="Module Disabled" {...register('disabled')} />
      <Input
        label="MQTT Server Address"
        disabled={moduleEnabled}
        {...register('address')}
      />
      <Input
        label="MQTT Username"
        disabled={moduleEnabled}
        {...register('username')}
      />
      <Input
        label="MQTT Password"
        type="password"
        autoComplete="off"
        disabled={moduleEnabled}
        {...register('password')}
      />
      <Checkbox
        label="Encryption Enabled"
        disabled={moduleEnabled}
        {...register('encryptionEnabled')}
      />
    </Form>
  );
};
