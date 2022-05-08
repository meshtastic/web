import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export const WiFi = (): JSX.Element => {
  const wifiConfig = useAppSelector(
    (state) => state.meshtastic.radio.config.wifi,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.Config_WiFiConfig>({
      defaultValues: wifiConfig,
    });

  const WifiApMode = useWatch({
    control,
    name: 'apMode',
    defaultValue: false,
  });

  useEffect(() => {
    reset(wifiConfig);
  }, [reset, wifiConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setConfig(
      {
        payloadVariant: {
          oneofKind: 'wifi',
          wifi: data,
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
      <Checkbox label="Enable WiFi AP" {...register('apMode')} />
      <Input label="WiFi SSID" disabled={WifiApMode} {...register('ssid')} />
      <Input
        type="password"
        autoComplete="off"
        label="WiFi PSK"
        disabled={WifiApMode}
        {...register('psk')}
      />
    </Form>
  );
};
