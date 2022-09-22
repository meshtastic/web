import type React from "react";
import { useEffect, useState } from "react";

import { fromByteArray, toByteArray } from "base64-js";
import { Controller, useForm } from "react-hook-form";

import { Input } from "@app/components/form/Input.js";
import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import {
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";

import { Select } from "../form/Select.js";
import { Toggle } from "../form/Toggle.js";

export interface SettingsPanelProps {
  channel: Protobuf.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps): JSX.Element => {
  const { connection } = useDevice();
  const [loading, setLoading] = useState(false);
  const [keySize, setKeySize] = useState<128 | 256>(256);
  const [pskHidden, setPskHidden] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    setValue,
  } = useForm<
    Omit<Protobuf.ChannelSettings, "psk"> & { psk: string; enabled: boolean }
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
        psk: toByteArray(data.psk ?? ""),
      },
    });

    await connection?.setChannel(channelData, (): Promise<void> => {
      reset({ ...data });
      setLoading(false);
      return Promise.resolve();
    });
  });

  return (
    <Form
      title="Channel Editor"
      breadcrumbs={[
        "Channels",
        channel.settings?.name.length
          ? channel.settings.name
          : channel.role === Protobuf.Channel_Role.PRIMARY
          ? "Primary"
          : `Channel: ${channel.index}`,
      ]}
      reset={() =>
        reset({
          enabled: [
            Protobuf.Channel_Role.SECONDARY,
            Protobuf.Channel_Role.PRIMARY,
          ].find((role) => role === channel?.role)
            ? true
            : false,
          ...channel?.settings,
          psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0)),
        })
      }
      loading={loading}
      dirty={isDirty}
      onSubmit={onSubmit}
    >
      {channel?.index !== 0 && (
        <>
          <Controller
            name="enabled"
            control={control}
            render={({ field: { value, ...rest } }) => (
              <Toggle
                label="Enabled"
                description="Description"
                checked={value}
                {...rest}
              />
            )}
          />
          <Input
            label="Name"
            description="Max transmit power in dBm"
            {...register("name")}
          />
        </>
      )}
      <Select
        label="Key Size"
        description="Desired size of generated key."
        value={keySize}
        onChange={(e): void => {
          setKeySize(parseInt(e.target.value) as 128 | 256);
        }}
        action={{
          icon: <ArrowPathIcon className="h-4" />,
          action: () => {
            const key = new Uint8Array(keySize / 8);
            crypto.getRandomValues(key);
            setValue("psk", fromByteArray(key));
          },
        }}
      >
        <option value={128}>128 Bit</option>
        <option value={256}>256 Bit</option>
      </Select>
      <Input
        width="100%"
        label="Pre-Shared Key"
        description="Max transmit power in dBm"
        type={pskHidden ? "password" : "text"}
        action={{
          icon: pskHidden ? (
            <EyeIcon className="w-4" />
          ) : (
            <EyeSlashIcon className="w-4" />
          ),
          action: () => {
            setPskHidden(!pskHidden);
          },
        }}
        {...register("psk")}
      />
      <Controller
        name="uplinkEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Uplink Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
      <Controller
        name="downlinkEnabled"
        control={control}
        render={({ field: { value, ...rest } }) => (
          <Toggle
            label="Downlink Enabled"
            description="Description"
            checked={value}
            {...rest}
          />
        )}
      />
    </Form>
  );
};
