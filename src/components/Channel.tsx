import React from 'react';

import { fromByteArray, toByteArray } from 'base64-js';
import { useForm, useWatch } from 'react-hook-form';
import { FaQrcode } from 'react-icons/fa';
import { FiEdit3, FiSave } from 'react-icons/fi';
import { MdRefresh, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import QRCode from 'react-qr-code';

import { Loading } from '@components/generic/Loading';
import { Modal } from '@components/generic/Modal';
import { connection } from '@core/connection';
import {
  Card,
  Checkbox,
  IconButton,
  Input,
  Select,
} from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface ChannelProps {
  channel: Protobuf.Channel;
  isPrimary?: boolean;
}

export const Channel = ({ channel, isPrimary }: ChannelProps): JSX.Element => {
  const [edit, setEdit] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);
  const [keySize, setKeySize] = React.useState<128 | 256>(256);
  const [pskHidden, setPskHidden] = React.useState(true);

  const { register, handleSubmit, setValue, control } = useForm<{
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
        psk: fromByteArray(channel.settings?.psk ?? new Uint8Array(0)),
      },
    },
  });

  const watchPsk = useWatch({
    control,
    name: 'settings.psk',
    defaultValue: '',
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
        psk: toByteArray(data.settings.psk ?? ''),
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
          <QRCode
            className="rounded-md"
            value={`https://www.meshtastic.org/d/#${watchPsk}`}
          />
        </Card>
      </Modal>
      {edit ? (
        <>
          {loading && <Loading />}
          <div className="flex my-auto">
            <form className="gap-3">
              {!isPrimary && (
                <Checkbox
                  label="Enabled"
                  {...register('enabled', { valueAsNumber: true })}
                />
              )}
              <Input label="Name" {...register('settings.name')} />
              <Select
                label="Key Size"
                options={[
                  { name: '128 Bit', value: 128 },
                  { name: '256 Bit', value: 256 },
                ]}
                value={keySize}
                onChange={(e): void => {
                  setKeySize(parseInt(e.target.value) as 128 | 256);
                }}
              />
              <Input
                label="Pre-Shared Key"
                type={pskHidden ? 'password' : 'text'}
                disabled
                action={
                  <>
                    <IconButton
                      onClick={(): void => {
                        setPskHidden(!setPskHidden);
                      }}
                      icon={pskHidden ? <MdVisibility /> : <MdVisibilityOff />}
                    />
                    <IconButton
                      onClick={(): void => {
                        const key = new Uint8Array(keySize);
                        crypto.getRandomValues(key);
                        setValue('settings.psk', fromByteArray(key));
                      }}
                      icon={<MdRefresh />}
                    />
                  </>
                }
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
