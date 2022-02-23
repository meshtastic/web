import type React from 'react';
import { useEffect, useState } from 'react';

import { fromByteArray, toByteArray } from 'base64-js';
import { useForm } from 'react-hook-form';
import { FiSave } from 'react-icons/fi';
import { MdRefresh, MdVisibility, MdVisibilityOff } from 'react-icons/md';

import { IconButton } from '@components/generic/button/IconButton';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface SettingsPanelProps {
  channel: Protobuf.Channel;
}

export const SettingsPanel = ({ channel }: SettingsPanelProps): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [keySize, setKeySize] = useState<128 | 256>(256);
  const [pskHidden, setPskHidden] = useState(true);

  const { register, handleSubmit, setValue, formState, reset } = useForm<
    Omit<Protobuf.ChannelSettings, 'psk'> & { psk: string; enabled: boolean }
  >({
    defaultValues: {
      enabled: [
        Protobuf.Channel_Role.SECONDARY,
        Protobuf.Channel_Role.PRIMARY,
      ].find((role) => role === channel?.role)
        ? true
        : false,
      ...channel?.settings,
      psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0)),
    },
  });

  useEffect(() => {
    reset({
      enabled: [
        Protobuf.Channel_Role.SECONDARY,
        Protobuf.Channel_Role.PRIMARY,
      ].find((role) => role === channel?.role)
        ? true
        : false,
      ...channel?.settings,
      psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0)),
    });
  }, [channel, reset]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    const channelData = Protobuf.Channel.create({
      role:
        channel?.role === Protobuf.Channel_Role.PRIMARY
          ? Protobuf.Channel_Role.PRIMARY
          : data.enabled
          ? Protobuf.Channel_Role.SECONDARY
          : Protobuf.Channel_Role.DISABLED,
      index: channel?.index,
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
    <div className="flex w-full flex-col">
      <Form loading={loading}>
        {channel?.index !== 0 && (
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
                icon={pskHidden ? <MdVisibility /> : <MdVisibilityOff />}
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
        <Checkbox label="Uplink Enabled" {...register('uplinkEnabled')} />
        <Checkbox label="Downlink Enabled" {...register('downlinkEnabled')} />
      </Form>
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
    </div>
  );
};
