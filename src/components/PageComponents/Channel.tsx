import { useEffect, useState } from "react";
import { fromByteArray, toByteArray } from "base64-js";
import { Controller, useForm } from "react-hook-form";
import { ChannelSettingsValidation } from "@app/validation/channelSettings.js";
import { Form } from "@components/form/Form";
import { Input } from "@components/form/Input.js";
import { Select } from "@components/form/Select.js";
import { Toggle } from "@components/form/Toggle.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { RefreshCwIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { Protobuf } from "@meshtastic/meshtasticjs";

export interface SettingsPanelProps {
  channel: Protobuf.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps): JSX.Element => {
  const { connection, addChannel } = useDevice();
  const [keySize, setKeySize] = useState<128 | 256>(256);
  const [pskHidden, setPskHidden] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    setValue
  } = useForm<ChannelSettingsValidation>({
    defaultValues: {
      enabled: [
        Protobuf.Channel_Role.SECONDARY,
        Protobuf.Channel_Role.PRIMARY
      ].find((role) => role === channel?.role)
        ? true
        : false,
      ...channel?.settings,
      psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0))
    },
    resolver: classValidatorResolver(ChannelSettingsValidation)
  });

  useEffect(() => {
    reset({
      enabled: [
        Protobuf.Channel_Role.SECONDARY,
        Protobuf.Channel_Role.PRIMARY
      ].find((role) => role === channel?.role)
        ? true
        : false,
      ...channel?.settings,
      psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0))
    });
  }, [channel, reset]);

  const onSubmit = handleSubmit((data) => {
    connection
      ?.setChannel(
        new Protobuf.Channel({
          role:
            channel?.role === Protobuf.Channel_Role.PRIMARY
              ? Protobuf.Channel_Role.PRIMARY
              : data.enabled
              ? Protobuf.Channel_Role.SECONDARY
              : Protobuf.Channel_Role.DISABLED,
          index: channel?.index,
          settings: {
            ...data,
            psk: toByteArray(data.psk ?? "")
          }
        })
      )
      .then(() =>
        addChannel({
          config: new Protobuf.Channel({
            index: channel.index,
            role: channel.role,
            settings: {
              ...data,
              psk: toByteArray(data.psk ?? "")
            }
          }),
          lastInterraction: new Date(),
          messages: []
        })
      );
  });

  return (
    <div className="flex flex-grow flex-col gap-2">
      {/* actions={[
          {
            label: "Apply",
            async onClick() {
              await onSubmit();
            }
          }
        ]} */}

      <Form onSubmit={onSubmit}>
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
              error={errors.name?.message}
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
            icon: <RefreshCwIcon size={16} />,
            action: () => {
              const key = new Uint8Array(keySize / 8);
              crypto.getRandomValues(key);
              setValue("psk", fromByteArray(key), {
                shouldDirty: true
              });
            }
          }}
        >
          <option value={128}>128 Bit</option>
          <option value={256}>256 Bit</option>
        </Select>
        <Input
          width="100%"
          label="Pre-Shared Key"
          description="Channel key to encrypt data"
          type={pskHidden ? "password" : "text"}
          action={{
            icon: pskHidden ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />,
            action: () => {
              setPskHidden(!pskHidden);
            }
          }}
          error={errors.psk?.message}
          {...register("psk")}
        />
        <Controller
          name="uplinkEnabled"
          control={control}
          render={({ field: { value, ...rest } }) => (
            <Toggle
              label="Uplink Enabled"
              description="Send packets to designated MQTT server"
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
              description="Recieve packets to designated MQTT server"
              checked={value}
              {...rest}
            />
          )}
        />
      </Form>
    </div>
  );
};
