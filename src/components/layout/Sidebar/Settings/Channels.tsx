import React from 'react';

import { useForm } from 'react-hook-form';
import { FiExternalLink, FiX } from 'react-icons/fi';
import {
  RiArrowDownLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
} from 'react-icons/ri';

import { ListItem } from '@app/components/generic/ListItem';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Checkbox, Input, Select, Tooltip } from '@meshtastic/components';
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
        </>
      )}
      {channels.map((channel) => (
        <ListItem
          key={channel.index}
          onClick={(): void => {
            setSelectedChannel(channel);
          }}
          status={
            <div
              className={`my-auto h-3 w-3 rounded-full ${
                [
                  Protobuf.Channel_Role.SECONDARY,
                  Protobuf.Channel_Role.PRIMARY,
                ].find((role) => role === channel.role)
                  ? 'bg-green-500'
                  : 'bg-gray-400'
              }`}
            />
          }
          selected={selectedChannel?.index === channel.index}
          selectedIcon={<FiExternalLink />}
          actions={
            <Tooltip content={`MQTT Status`}>
              <div className="rounded-md p-2">
                {channel.settings?.uplinkEnabled &&
                channel.settings?.downlinkEnabled ? (
                  <RiArrowUpDownLine className="p-0.5 group-active:scale-90" />
                ) : channel.settings?.uplinkEnabled ? (
                  <RiArrowUpLine className="p-0.5 group-active:scale-90" />
                ) : channel.settings?.downlinkEnabled ? (
                  <RiArrowDownLine className="p-0.5 group-active:scale-90" />
                ) : (
                  <FiX className="p-0.5" />
                )}
              </div>
            </Tooltip>
          }
        >
          <div>
            {channel.settings?.name.length
              ? channel.settings.name
              : channel.role === Protobuf.Channel_Role.PRIMARY
              ? 'Primary'
              : `Channel: ${channel.index}`}
          </div>
        </ListItem>
      ))}
    </>
  );
};
