import React from 'react';

import { useForm } from 'react-hook-form';
import { FiEdit3, FiSave } from 'react-icons/fi';

import { Loading } from '@components/generic/Loading';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { connection } from '../core/connection';
import { Checkbox } from './generic/form/Checkbox';
import { Input } from './generic/form/Input';
import { IconButton } from './generic/IconButton';

export interface ChannelProps {
  channel: Protobuf.Channel;
}

export const Channel = ({ channel }: ChannelProps): JSX.Element => {
  const [edit, setEdit] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { register, handleSubmit, formState } = useForm<{
    enabled: boolean;
    settings: {
      name: string;
      bandwidth?: number;
      codingRate?: number;
      spreadFactor?: number;
      downlinkEnabled?: boolean;
      uplinkEnabled?: boolean;
      txPower?: number;
      psk?: string;
    };
  }>({
    defaultValues: {
      enabled:
        channel.role ===
        (Protobuf.Channel_Role.PRIMARY || Protobuf.Channel_Role.SECONDARY)
          ? true
          : false,
      settings: {
        name: channel.settings?.name,
        bandwidth: channel.settings?.bandwidth,
        codingRate: channel.settings?.codingRate,
        spreadFactor: channel.settings?.spreadFactor,
        downlinkEnabled: channel.settings?.downlinkEnabled,
        uplinkEnabled: channel.settings?.uplinkEnabled,
        txPower: channel.settings?.txPower,
        psk: new TextDecoder().decode(channel.settings?.psk),
      },
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    const adminChannel = Protobuf.Channel.create({
      role: data.enabled
        ? Protobuf.Channel_Role.SECONDARY
        : Protobuf.Channel_Role.DISABLED,
      index: channel.index,
      settings: {
        ...data.settings,
        psk: new TextEncoder().encode(data.settings.psk),
      },
    });

    await connection.setChannel(adminChannel, (): Promise<void> => {
      setLoading(false);
      return Promise.resolve();
    });
  });

  return (
    <div className="relative flex justify-between p-3 bg-gray-100 rounded-md dark:bg-gray-700">
      {edit ? (
        <>
          {loading && <Loading />}
          <div className="my-auto space-x-2">
            <form>
              <div className="flex space-x-2">
                {/* @todo: change to disable & make primary buttons */}
                <Checkbox
                  label="Enabled"
                  {...register('enabled', { valueAsNumber: true })}
                />
              </div>
              <Input label="Name" {...register('settings.name')} />
              <Input label="Pre-Shared Key" {...register('settings.psk')} />
              <Input
                label="Bandwidth"
                type="number"
                {...register('settings.bandwidth', { valueAsNumber: true })}
              />
              <Input
                label="Spread Factor"
                type="number"
                min={7}
                max={12}
                {...register('settings.spreadFactor', { valueAsNumber: true })}
              />
              <Input
                label="Coding Rate"
                type="number"
                {...register('settings.codingRate', { valueAsNumber: true })}
              />
              <Input
                label="Transmit Power"
                type="number"
                {...register('settings.txPower', { valueAsNumber: true })}
              />
              <Checkbox
                label="Upling Enabled"
                {...register('settings.uplinkEnabled')}
              />
              <Checkbox
                label="Downlink Enabled"
                {...register('settings.downlinkEnabled')}
              />
            </form>
          </div>
          <IconButton
            onClick={async (): Promise<void> => {
              await onSubmit();

              setEdit(false);
            }}
            icon={<FiSave />}
          />
        </>
      ) : (
        <>
          <div className="flex my-auto space-x-2">
            <div
              className={`h-3 my-auto w-3 rounded-full ${
                channel.role === Protobuf.Channel_Role.SECONDARY
                  ? 'bg-green-500'
                  : 'bg-gray-400'
              }`}
            />
            <div>
              {channel.settings?.name.length
                ? channel.settings.name
                : channel.role === Protobuf.Channel_Role.PRIMARY
                ? 'Primary'
                : `Channel: ${channel.index}`}
            </div>
          </div>
          <IconButton
            onClick={(): void => {
              setEdit(true);
            }}
            icon={<FiEdit3 />}
          />
        </>
      )}
    </div>
  );
};
