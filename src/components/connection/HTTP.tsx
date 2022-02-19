import type React from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@components/generic/button/Button';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connection, connectionUrl, setConnection } from '@core/connection';
import { connType, setConnectionParams } from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';

export interface HTTPProps {
  connecting: boolean;
}

export const HTTP = ({ connecting }: HTTPProps): JSX.Element => {
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
        disabled={connecting}
        {...register('ipSource')}
      />
      {watchIpSource === 'local' ? (
        <Input label="Host" value={connectionUrl} disabled />
      ) : (
        <Input label="Host" disabled={connecting} {...register('ip')} />
      )}
      <Checkbox label="Use TLS?" disabled={connecting} {...register('tls')} />
      <Button
        className="mt-2 ml-auto"
        onClick={async (): Promise<void> => {
          if (connecting) {
            await connection.disconnect();
          } else {
            await onSubmit();
          }
        }}
        border
      >
        {connecting ? 'Disconnect' : 'Connect'}
      </Button>
    </form>
  );
};
