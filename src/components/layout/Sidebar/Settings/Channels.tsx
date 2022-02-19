import React from 'react';

import { useForm } from 'react-hook-form';
import { FiSave } from 'react-icons/fi';

import { IconButton } from '@components/generic/button/IconButton';
import { Checkbox } from '@components/generic/form/Checkbox';
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
  const [usePreset, setUsePreset] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [selectedChannel, setSelectedChannel] = React.useState<
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
          <form onSubmit={onSubmit}>
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
          </form>
          <div className="flex w-full bg-white dark:bg-secondaryDark">
            <div className="ml-auto p-2">
              <IconButton
                disabled={!formState.isDirty}
                onClick={async (): Promise<void> => {
                  await onSubmit();
                }}
                icon={<FiSave />}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};
