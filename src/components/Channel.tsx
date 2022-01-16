import React from 'react';

import { fromByteArray, toByteArray } from 'base64-js';
import { useForm, useWatch } from 'react-hook-form';
import { FaQrcode } from 'react-icons/fa';
import {
  FiChevronDown,
  FiChevronUp,
  FiCode,
  FiRotateCcw,
  FiSave,
} from 'react-icons/fi';
import { MdRefresh, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import JSONPretty from 'react-json-pretty';
import QRCode from 'react-qr-code';

import { Loading } from '@components/generic/Loading';
import { Modal } from '@components/generic/Modal';
import { connection } from '@core/connection';
import { Disclosure } from '@headlessui/react';
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
}

export const Channel = ({ channel }: ChannelProps): JSX.Element => {
  const [loading, setLoading] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);
  const [keySize, setKeySize] = React.useState<128 | 256>(256);
  const [pskHidden, setPskHidden] = React.useState(true);
  const [showDebug, setShowDebug] = React.useState(false);

  const { register, handleSubmit, setValue, control, formState, reset } =
    useForm<
      Omit<Protobuf.ChannelSettings, 'psk'> & { psk: string; enabled: boolean }
    >({
      defaultValues: {
        enabled: [
          Protobuf.Channel_Role.SECONDARY,
          Protobuf.Channel_Role.PRIMARY,
        ].find((role) => role === channel.role)
          ? true
          : false,
        ...channel.settings,
        psk: fromByteArray(channel.settings?.psk ?? new Uint8Array(0)),
      },
    });

  const watchPsk = useWatch({
    control,
    name: 'psk',
    defaultValue: '',
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    const channelData = Protobuf.Channel.create({
      role:
        channel.role === Protobuf.Channel_Role.PRIMARY
          ? Protobuf.Channel_Role.PRIMARY
          : data.enabled
          ? Protobuf.Channel_Role.SECONDARY
          : Protobuf.Channel_Role.DISABLED,
      index: channel.index,
      settings: {
        ...data,
        psk: toByteArray(data.psk ?? ''),
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
      <Modal
        open={showDebug}
        onClose={(): void => {
          setShowDebug(false);
        }}
      >
        <Card>
          <div className="p-10 overflow-y-auto text-left max-h-96">
            <JSONPretty data={channel} />
          </div>
        </Card>
      </Modal>
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
      <Disclosure
        as="div"
        className="bg-gray-100 rounded-md dark:bg-secondaryDark"
      >
        {({ open }): JSX.Element => (
          <>
            <Disclosure.Button
              as="div"
              className="relative flex justify-between p-3"
            >
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
                  {open && (
                    <>
                      <IconButton
                        onClick={(e): void => {
                          e.stopPropagation();
                          reset();
                        }}
                        disabled={loading || !formState.isDirty}
                        icon={<FiRotateCcw />}
                      />
                      <IconButton
                        onClick={async (e): Promise<void> => {
                          e.stopPropagation();
                          await onSubmit();
                        }}
                        disabled={loading || !formState.isDirty}
                        icon={<FiSave />}
                      />
                    </>
                  )}
                  <IconButton
                    onClick={(e): void => {
                      e.stopPropagation();
                      setShowDebug(true);
                    }}
                    icon={<FiCode className="w-5 h-5" />}
                  />

                  <IconButton
                    onClick={(e): void => {
                      e.stopPropagation();
                      setShowQr(true);
                    }}
                    icon={<FaQrcode />}
                  />
                  <IconButton
                    icon={open ? <FiChevronUp /> : <FiChevronDown />}
                  />
                </div>
              </>
            </Disclosure.Button>
            <Disclosure.Panel className="p-2 border-t border-gray-300 dark:border-gray-600">
              {loading && <Loading />}
              <div className="flex px-2 my-auto">
                <form className="w-full gap-3">
                  {channel.index !== 0 && (
                    <>
                      <Checkbox
                        label="Enabled"
                        {...register('enabled', { valueAsNumber: true })}
                      />
                      <Input label="Name" {...register('name')} />
                    </>
                  )}

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
                            setPskHidden(!pskHidden);
                          }}
                          icon={
                            pskHidden ? <MdVisibility /> : <MdVisibilityOff />
                          }
                        />
                        <IconButton
                          onClick={(): void => {
                            const key = new Uint8Array(keySize);
                            crypto.getRandomValues(key);
                            setValue('psk', fromByteArray(key));
                          }}
                          icon={<MdRefresh />}
                        />
                      </>
                    }
                    {...register('psk')}
                  />
                  <Checkbox
                    label="Uplink Enabled"
                    {...register('uplinkEnabled')}
                  />
                  <Checkbox
                    label="Downlink Enabled"
                    {...register('downlinkEnabled')}
                  />
                </form>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </>
  );
};
