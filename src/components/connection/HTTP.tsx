import type React from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { useAppDispatch } from '@app/hooks/redux.js';
import { connectionUrl, setConnection } from '@core/connection';
import { connType, setConnectionParams } from '@core/slices/appSlice';
import { Button, Checkbox, Input, Select } from '@meshtastic/components';

export const HTTP = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const { register, handleSubmit, control } = useForm<{
    ipSource: 'local' | 'remote';
    ip?: string;
    tls: boolean;
  }>({
    defaultValues: {
      ipSource: 'local',
      ip: connectionUrl,
      tls: false,
    },
  });

  const watchIpSource = useWatch({
    control,
    name: 'ipSource',
    defaultValue: 'local',
  });

  const onSubmit = handleSubmit(async (data) => {
    dispatch(
      setConnectionParams({
        type: connType.HTTP,
        params: {
          address: data.ip ?? connectionUrl,
          tls: data.tls,
          fetchInterval: 2000,
        },
      }),
    );
    await setConnection(connType.HTTP);
  });

  return (
    <form onSubmit={onSubmit}>
      <Select
        label="Host Source"
        options={[
          {
            name: 'Local',
            value: 'local',
          },
          {
            name: 'Remote',
            value: 'remote',
          },
        ]}
        {...register('ipSource')}
      />
      {watchIpSource === 'local' ? (
        <Input label="Host" value={connectionUrl} disabled />
      ) : (
        <Input label="Host" {...register('ip')} />
      )}
      <Checkbox label="Use TLS?" {...register('tls')} />
      <Button type="submit" className="mt-2 ml-auto" border>
        Connect
      </Button>
    </form>
  );
};
