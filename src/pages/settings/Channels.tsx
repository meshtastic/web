import React from 'react';

import { useForm } from 'react-hook-form';
import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { Channel } from '@components/Channel';
import { FormFooter } from '@components/FormFooter';
import { Cover } from '@components/generic/Cover';
import { Loading } from '@components/generic/Loading';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import {
  Card,
  Checkbox,
  IconButton,
  Input,
  Select,
} from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

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

  const [usePreset, setUsePreset] = React.useState(true);
  const [debug, setDebug] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

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
      rightButton={
        <IconButton
          icon={<FiCode className="w-5 h-5" />}
          active={debug}
          onClick={(): void => {
            setDebug(!debug);
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
        )}
        <Card>
          <Cover enabled={debug} content={<JSONPretty data={channels} />} />
          <div className="w-full p-4 space-y-2 md:p-10">
            {channels.map((channel) => (
              <Channel key={channel.channel.index} channel={channel.channel} />
            ))}
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
