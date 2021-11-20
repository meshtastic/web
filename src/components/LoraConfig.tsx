import React from 'react';

import { useForm } from 'react-hook-form';

import { Card } from '@components/generic/Card';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Loading } from '@components/generic/Loading';
import { connection } from '@core/connection';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface LoraConfigProps {
  channel: Protobuf.Channel;
}

export const LoraConfig = ({ channel }: LoraConfigProps): JSX.Element => {
  const [loading, setLoading] = React.useState(false);

  const { register, handleSubmit } = useForm<{
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
    <Card>
      {loading && <Loading />}
      <div className="w-full max-w-3xl p-10 md:max-w-xl">
        {/* TODO: get gap working */}
        <form onSubmit={onSubmit}>
          <Input
            label="Bandwidth"
            type="number"
            suffix="MHz"
            {...register('settings.bandwidth', { valueAsNumber: true })}
          />
          <Input
            label="Spread Factor"
            type="number"
            suffix="CPS"
            min={7}
            max={12}
            {...register('settings.spreadFactor', {
              valueAsNumber: true,
            })}
          />
          <Input
            label="Coding Rate"
            type="number"
            {...register('settings.codingRate', { valueAsNumber: true })}
          />
          <Input
            label="Transmit Power"
            type="number"
            suffix="dBm"
            {...register('settings.txPower', { valueAsNumber: true })}
          />
          <Checkbox
            label="Uplink Enabled"
            {...register('settings.uplinkEnabled')}
          />
          <Checkbox
            label="Downlink Enabled"
            {...register('settings.downlinkEnabled')}
          />
        </form>
      </div>
    </Card>
  );
};
