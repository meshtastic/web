import type React from "react";
import { useEffect, useState } from "react";

import { fromByteArray, toByteArray } from "base64-js";
import {
  Button,
  EyeOffIcon,
  EyeOpenIcon,
  FormField,
  IconButton,
  majorScale,
  Pane,
  RefreshIcon,
  SelectField,
  Switch,
  TextInputField,
  Tooltip,
} from "evergreen-ui";
import { Controller, useForm } from "react-hook-form";

import { Form } from "@components/form/Form";
import { useDevice } from "@core/providers/useDevice.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

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
    <Form loading={loading} dirty={isDirty} onSubmit={onSubmit}>
      {channel?.index !== 0 && (
        <>
          <FormField
            label="Enabled"
            description="Description"
            isInvalid={!!errors.enabled?.message}
            validationMessage={errors.enabled?.message}
          >
            <Controller
              name="enabled"
              control={control}
              render={({ field: { value, ...field } }) => (
                <Switch
                  height={24}
                  marginLeft="auto"
                  checked={value}
                  {...field}
                />
              )}
            />
          </FormField>
          <TextInputField
            label="Name"
            description="Max transmit power in dBm"
            {...register("name")}
          />
        </>
      )}
      <Pane display="flex" gap={majorScale(1)}>
        <SelectField
          width="100%"
          label="Key Size"
          description="Desired size of generated key."
          value={keySize}
          onChange={(e): void => {
            setKeySize(parseInt(e.target.value) as 128 | 256);
          }}
        >
          <option value={128}>128 Bit</option>
          <option value={256}>256 Bit</option>
        </SelectField>
        <Tooltip content="Generate new key">
          <IconButton
            marginTop={majorScale(6)}
            onClick={(
              e: React.MouseEvent<HTMLButtonElement, MouseEvent>
            ): void => {
              e.preventDefault();
              const key = new Uint8Array(keySize / 8);
              crypto.getRandomValues(key);
              setValue("psk", fromByteArray(key));
            }}
            icon={<RefreshIcon />}
          />
        </Tooltip>
      </Pane>
      <Pane display="flex" gap={majorScale(1)}>
        <TextInputField
          width="100%"
          label="Pre-Shared Key"
          description="Max transmit power in dBm"
          type={pskHidden ? "password" : "text"}
          {...register("psk")}
        />
        <Tooltip content={pskHidden ? "Show key" : "Hide key"}>
          <Button
            marginTop={majorScale(6)}
            width={majorScale(12)}
            onClick={(
              e: React.MouseEvent<HTMLButtonElement, MouseEvent>
            ): void => {
              e.preventDefault();
              setPskHidden(!pskHidden);
            }}
            iconBefore={pskHidden ? <EyeOpenIcon /> : <EyeOffIcon />}
          >
            {pskHidden ? "Show" : "Hide"}
          </Button>
        </Tooltip>
      </Pane>
      <FormField
        label="Uplink Enabled"
        description="Description"
        isInvalid={!!errors.uplinkEnabled?.message}
        validationMessage={errors.uplinkEnabled?.message}
      >
        <Controller
          name="uplinkEnabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
      <FormField
        label="Downlink Enabled"
        description="Description"
        isInvalid={!!errors.downlinkEnabled?.message}
        validationMessage={errors.downlinkEnabled?.message}
      >
        <Controller
          name="downlinkEnabled"
          control={control}
          render={({ field: { value, ...field } }) => (
            <Switch height={24} marginLeft="auto" checked={value} {...field} />
          )}
        />
      </FormField>
    </Form>
  );
};
