import React from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { useAppSelector } from '@app/hooks/redux';
import { Channel } from '@components/Channel';
import { FormFooter } from '@components/FormFooter';
import { Button } from '@components/generic/Button';
import { Card } from '@components/generic/Card';
import { Cover } from '@components/generic/Cover';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { IconButton } from '@components/generic/IconButton';
import { Loading } from '@components/generic/Loading';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
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
  const channel = channels[0].channel;

  const [debug, setDebug] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  enum PresetName {
    'Long Slow',
    'Long Alt',
    'Medium',
    'Short Fast',
  }

  const { register, handleSubmit, reset, formState, control } = useForm<{
    simple: boolean;
    preset?: PresetName;
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
      simple: true,
      preset: PresetName['Long Slow'],
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

  const presets = [
    {
      name: PresetName['Long Slow'],
      config: {
        bandwidth: 125,
        codingRate: 8, // 4/8

        spreadFactor: 12, // 4096chips/symbol
      },
    },
    {
      name: PresetName['Long Alt'],
      config: {
        bandwidth: 31.25,
        codingRate: 8, // 4/8
        spreadFactor: 9, // 512chips/symbol,
      },
    },
    {
      name: PresetName['Medium'],
      config: {
        bandwidth: 125,
        codingRate: 5, // 4/5
        spreadFactor: 7, // 128chips/symbol,
      },
    },
    {
      name: PresetName['Short Fast'],
      config: {
        bandwidth: 500,
        codingRate: 5, // 4/5
        spreadFactor: 7, // 128chips/symbol,
      },
    },
  ];

  const watchSimple = useWatch({
    control,
    name: 'simple',
    defaultValue: true,
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    console.log(data);
    const selectedPreset = data.simple
      ? presets.find((preset) => preset.name === data.preset)?.config
      : undefined;

    const adminChannel = Protobuf.Channel.create({
      role: data.enabled
        ? Protobuf.Channel_Role.SECONDARY
        : Protobuf.Channel_Role.DISABLED,
      index: channel.index,
      settings: {
        ...data.settings,
        ...selectedPreset,
        psk: new TextEncoder().encode(data.settings.psk),
      },
    });

    console.log(adminChannel);

    await connection.setChannel(adminChannel, (): Promise<void> => {
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
        {channel && (
          <Card>
            {loading && <Loading />}
            <div className="w-full max-w-3xl p-10 md:max-w-xl">
              {/* TODO: get gap working */}
              <Checkbox
                label="Use Presets"
                {...register('simple')}
                // checked={simpleChannelSettings}
                // onChange={(e): void =>
                //   setSimpleChannelSettings(e.target.checked)
                // }
              />
              <form onSubmit={onSubmit}>
                {watchSimple ? (
                  <Select label="Preset" optionsEnum={PresetName} />
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
              <Channel
                key={channel.channel.index}
                channel={channel.channel}
                hideEnabled={channel.channel.index === 0}
              />
            ))}

            <div className="flex justify-between">
              <div
                onClick={(): Promise<void> => {
                  return connection.confirmSetChannel();
                }}
                className="text-sm font-thin text-gray-400 dark:text-gray-300"
              >
                Please ensure any changes are working before confirming
              </div>
              <Button active>Confirm</Button>
            </div>
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
