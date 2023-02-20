import { fromByteArray, toByteArray } from "base64-js";
import type { ChannelValidation } from "@app/validation/channel.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm } from "../Form/DynamicForm.js";

export interface SettingsPanelProps {
  channel: Protobuf.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps): JSX.Element => {
  // const {
  //   register,
  //   handleSubmit,
  //   formState: { errors, isDirty },
  //   reset,
  //   control,
  //   setValue
  // } = useForm<ChannelSettingsValidation>({
  //   defaultValues: {
  //     enabled: [
  //       Protobuf.Channel_Role.SECONDARY,
  //       Protobuf.Channel_Role.PRIMARY
  //     ].find((role) => role === channel?.role)
  //       ? true
  //       : false,
  //     ...channel?.settings,
  //     psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0))
  //   },
  //   resolver: classValidatorResolver(ChannelSettingsValidation)
  // });

  // useEffect(() => {
  //   reset({
  //     enabled: [
  //       Protobuf.Channel_Role.SECONDARY,
  //       Protobuf.Channel_Role.PRIMARY
  //     ].find((role) => role === channel?.role)
  //       ? true
  //       : false,
  //     ...channel?.settings,
  //     psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0))
  //   });
  // }, [channel, reset]);

  // const onSubmit = handleSubmit((data) => {
  //   connection
  //     ?.setChannel(
  //       new Protobuf.Channel({
  //         role:
  //           channel?.role === Protobuf.Channel_Role.PRIMARY
  //             ? Protobuf.Channel_Role.PRIMARY
  //             : data.enabled
  //             ? Protobuf.Channel_Role.SECONDARY
  //             : Protobuf.Channel_Role.DISABLED,
  //         index: channel?.index,
  //         settings: {
  //           ...data,
  //           psk: toByteArray(data.psk ?? "")
  //         }
  //       })
  //     )
  //     .then(() =>
  //       addChannel({
  //         config: new Protobuf.Channel({
  //           index: channel.index,
  //           role: channel.role,
  //           settings: {
  //             ...data,
  //             psk: toByteArray(data.psk ?? "")
  //           }
  //         }),
  //         lastInterraction: new Date(),
  //         messages: []
  //       })
  //     );
  // });

  const onSubmit = (data: ChannelValidation) => {
    console.log(data);
  };

  return (
    <DynamicForm<ChannelValidation>
      onSubmit={onSubmit}
      submitType="onSubmit"
      hasSubmitButton={true}
      defaultValues={{
        ...channel,
        ...{
          settings: {
            ...channel?.settings,
            psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0))
          }
        }
      }}
      fieldGroups={[
        {
          label: "Bluetooth Settings",
          description: "Settings for the Bluetooth module",
          fields: [
            {
              type: "select",
              name: "role",
              label: "Role",
              description: "Description",
              properties: {
                enumValue: Protobuf.Channel_Role
              }
            },
            {
              type: "password",
              name: "settings.psk",
              label: "pre-Shared Key",
              description: "Description",
              properties: {
                // act
              }
            },
            {
              type: "number",
              name: "settings.channelNum",
              label: "Channel Number",
              description: "Description"
            },
            {
              type: "text",
              name: "settings.name",
              label: "Name",
              description: "Description"
            },
            {
              type: "number",
              name: "settings.id",
              label: "ID",
              description: "Description"
            },
            {
              type: "toggle",
              name: "settings.uplinkEnabled",
              label: "Uplink Enabled",
              description: "Description"
            },
            {
              type: "toggle",
              name: "settings.downlinkEnabled",
              label: "Downlink Enabled",
              description: "Description"
            }
          ]
        }
      ]}
    />
  );
};
