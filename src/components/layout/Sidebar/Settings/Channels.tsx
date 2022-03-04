import type React from 'react';
import { useState } from 'react';

import { useForm } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Channels = (): JSX.Element => {
  const channels = useAppSelector((state) => state.meshtastic.radio.channels);
  const adminChannel =
    channels.find(
      (channel) => channel.role === Protobuf.Channel_Role.PRIMARY,
    ) ?? channels[0];
  const [usePreset, setUsePreset] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<
    Protobuf.Channel | undefined
  >();

  const { register, handleSubmit, reset, formState } = useForm<
    DeepOmit<Protobuf.Channel, 'psk'>
  >({
    defaultValues: {
      ...adminChannel,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);

    const channelData = Protobuf.Channel.create({
      ...data,
      settings: {
        ...data.settings,
        psk: adminChannel.settings?.psk,
      },
    });

    await connection.setChannel(channelData, (): Promise<void> => {
      reset({ ...data });
      setLoading(false);
      return Promise.resolve();
    });
  });

  return (
    <>
      {adminChannel && (
        <>
          <Checkbox
            checked={usePreset}
            label="Use Presets"
            onChange={(e): void => setUsePreset(e.target.checked)}
          />
          <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
            {usePreset ? (
              <Select
                label="Preset"
                optionsEnum={Protobuf.ChannelSettings_ModemConfig}
                {...register('settings.modemConfig', {
                  valueAsNumber: true,
                })}
              />
            ) : (
              <>
                <Input
                  label="Bandwidth"
                  type="number"
                  suffix="MHz"
                  {...register('settings.bandwidth', {
                    valueAsNumber: true,
                  })}
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
                  {...register('settings.codingRate', {
                    valueAsNumber: true,
                  })}
                />
              </>
            )}
            <Input
              label="Transmit Power"
              type="number"
              suffix="dBm"
              {...register('settings.txPower', { valueAsNumber: true })}
            />
          </Form>
        </>
      )}
    </>
  );
};
