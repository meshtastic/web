import React from 'react';

import { useForm } from 'react-hook-form';
import { FiExternalLink, FiMenu, FiX } from 'react-icons/fi';
import {
  RiArrowDownLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
} from 'react-icons/ri';

import { Tooltip } from '@app/components/generic/Tooltip';
import type { ChannelData } from '@app/core/slices/meshtasticSlice';
import { FormFooter } from '@components/FormFooter';
import { Loading } from '@components/generic/Loading';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { useBreakpoint } from '@hooks/useBreakpoint';
import {
  Card,
  Checkbox,
  IconButton,
  Input,
  Select,
} from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { ChannelsSidebar } from '../../components/pages/settings/channels/ChannelsSidebar';

export interface ChannelsProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Channels = ({
  navOpen,
  setNavOpen,
}: ChannelsProps): JSX.Element => {
  const channels = useAppSelector((state) => state.meshtastic.radio.channels);
  const adminChannel =
    channels.find(
      (channel) => channel.channel.role === Protobuf.Channel_Role.PRIMARY,
    ) ?? channels[0];
  const { breakpoint } = useBreakpoint();
  const [usePreset, setUsePreset] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(breakpoint !== 'sm');
  const [selectedChannel, setSelectedChannel] = React.useState<
    ChannelData | undefined
  >();

  const { register, handleSubmit, reset, formState } = useForm<
    DeepOmit<Protobuf.Channel, 'psk'>
  >({
    defaultValues: {
      ...adminChannel.channel,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);

    const channelData = Protobuf.Channel.create({
      ...data,
      settings: {
        ...data.settings,
        psk: adminChannel.channel.settings?.psk,
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
      <PrimaryTemplate
        title="Channels"
        tagline="Settings"
        leftButton={
          <IconButton
            icon={<FiMenu className="w-5 h-5" />}
            onClick={(): void => {
              setNavOpen && setNavOpen(!navOpen);
            }}
          />
        }
        footer={
          <FormFooter
            dirty={formState.isDirty}
            saveAction={onSubmit}
            clearAction={reset}
          />
        }
      >
        <div className="space-y-4">
          {adminChannel && (
            <Card>
              {loading && <Loading />}
              <div className="w-full max-w-3xl p-10 md:max-w-xl">
                {/* TODO: get gap working */}
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
              </div>
            </Card>
          )}
          <Card>
            <div className="w-full p-4 space-y-2 md:p-10">
              {channels.map((channel) => (
                <div
                  key={channel.channel.index}
                  onClick={(): void => {
                    setSelectedChannel(channel);
                    setSidebarOpen(true);
                  }}
                  className={`flex justify-between p-2 border border-gray-300 dark:border-gray-600 bg-gray-100 rounded-md dark:bg-secondaryDark shadow-md ${
                    selectedChannel?.channel.index === channel.channel.index
                      ? 'border-primary dark:border-primary'
                      : ''
                  }`}
                >
                  <div className="flex my-auto space-x-2">
                    <div
                      className={`h-3 my-auto w-3 rounded-full ${
                        [
                          Protobuf.Channel_Role.SECONDARY,
                          Protobuf.Channel_Role.PRIMARY,
                        ].find((role) => role === channel.channel.role)
                          ? 'bg-green-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      {channel.channel.settings?.name.length
                        ? channel.channel.settings.name
                        : channel.channel.role === Protobuf.Channel_Role.PRIMARY
                        ? 'Primary'
                        : `Channel: ${channel.channel.index}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip contents={`MQTT Status`}>
                      <div className="p-2 rounded-md">
                        {channel.channel.settings?.uplinkEnabled &&
                        channel.channel.settings?.downlinkEnabled ? (
                          <RiArrowUpDownLine className="p-0.5 group-active:scale-90" />
                        ) : channel.channel.settings?.uplinkEnabled ? (
                          <RiArrowUpLine className="p-0.5 group-active:scale-90" />
                        ) : channel.channel.settings?.downlinkEnabled ? (
                          <RiArrowDownLine className="p-0.5 group-active:scale-90" />
                        ) : (
                          <FiX className="p-0.5" />
                        )}
                      </div>
                    </Tooltip>
                    <IconButton
                      active={
                        selectedChannel?.channel.index === channel.channel.index
                      }
                      icon={<FiExternalLink />}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PrimaryTemplate>
      {sidebarOpen && (
        <ChannelsSidebar
          closeSidebar={(): void => {
            setSidebarOpen(false);
          }}
          channel={selectedChannel?.channel}
        />
      )}
    </>
  );
};
