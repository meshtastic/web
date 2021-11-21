import React from 'react';

import { useForm } from 'react-hook-form';
import { FaQrcode } from 'react-icons/fa';
import { FiEdit3, FiSave } from 'react-icons/fi';
import QRCode from 'react-qr-code';

import { Card } from '@components/generic/Card';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { IconButton } from '@components/generic/IconButton';
import { Loading } from '@components/generic/Loading';
import { Modal } from '@components/generic/Modal';
import { connection } from '@core/connection';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface ChannelProps {
  channel: Protobuf.Channel;
  hideEnabled?: boolean;
}

export const Channel = ({
  channel,
  hideEnabled,
}: ChannelProps): JSX.Element => {
  const [edit, setEdit] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);

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
      enabled: [
        Protobuf.Channel_Role.SECONDARY,
        Protobuf.Channel_Role.PRIMARY,
      ].find((role) => role === channel.role)
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
      role:
        channel.role === Protobuf.Channel_Role.PRIMARY
          ? Protobuf.Channel_Role.PRIMARY
          : data.enabled
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
      <Modal
        open={showQr}
        onClose={(): void => {
          setShowQr(false);
        }}
      >
        <Card>
          <QRCode className="rounded-md" value="test" />
        </Card>
      </Modal>
      {edit ? (
        <>
          {loading && <Loading />}
          <div className="flex my-auto">
            {/* TODO: get gap working */}
            <form className="gap-3">
              {/* @todo: change to disable & make primary buttons */}
              {!hideEnabled && (
                <Checkbox
                  label="Enabled"
                  {...register('enabled', { valueAsNumber: true })}
                />
              )}
              <Input label="Name" {...register('settings.name')} />
              <Input
                label="Pre-Shared Key"
                type="password"
                {...register('settings.psk')}
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
                [
                  Protobuf.Channel_Role.SECONDARY,
                  Protobuf.Channel_Role.PRIMARY,
                ].find((role) => role === channel.role)
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
          <div className="flex gap-2">
            <IconButton
              onClick={(): void => {
                setShowQr(true);
              }}
              icon={<FaQrcode />}
            />
            <IconButton
              onClick={(): void => {
                setEdit(true);
              }}
              icon={<FiEdit3 />}
            />
          </div>
        </>
      )}
    </div>
  );
};
