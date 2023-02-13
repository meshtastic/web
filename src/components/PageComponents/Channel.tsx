import { useEffect, useState } from "react";
import { fromByteArray, toByteArray } from "base64-js";
import type { ChannelSettingsValidation } from "@app/validation/channelSettings.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm } from "../Form/DynamicForm.js";

export interface SettingsPanelProps {
  channel: Protobuf.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps): JSX.Element => {
  const { connection, addChannel } = useDevice();
  const [keySize, setKeySize] = useState<128 | 256>(256);
  const [pskHidden, setPskHidden] = useState(true);

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

  const onSubmit = (data: ChannelSettingsValidation) => {
    console.log(data);
  };

  return (
    // <div className="p-3">
    //   <form onSubmit={onSubmit}>
    //     {channel?.index !== 0 && (
    //       <>
    //         <Controller
    //           name="enabled"
    //           control={control}
    //           render={({ field: { value, ...rest } }) => (
    //             <>
    //               <Label>Enabled</Label>
    //               <Switch
    //                 // label="Enabled"
    //                 // description="Description"
    //                 checked={value}
    //                 {...rest}
    //               />
    //             </>
    //           )}
    //         />
    //         <Label>Name</Label>
    //         <Input
    //           // description="Max transmit power in dBm"
    //           // error={errors.name?.message}
    //           {...register("name")}
    //         />
    //       </>
    //     )}
    //     {/* <Select
    //       label="Key Size"
    //       description="Desired size of generated key."
    //       value={keySize}
    //       onChange={(e): void => {
    //         setKeySize(parseInt(e.target.value) as 128 | 256);
    //       }}
    //       action={{
    //         icon: <RefreshCwIcon size={16} />,
    //         action: () => {
    //           const key = new Uint8Array(keySize / 8);
    //           crypto.getRandomValues(key);
    //           setValue("psk", fromByteArray(key), {
    //             shouldDirty: true
    //           });
    //         }
    //       }}
    //     >
    //       <option value={128}>128 Bit</option>
    //       <option value={256}>256 Bit</option>
    //     </Select> */}
    //     <Label>Pre-Shared Key</Label>
    //     <Input
    //       // width="100%"
    //       // label="Pre-Shared Key"
    //       // description="Channel key to encrypt data"
    //       type={pskHidden ? "password" : "text"}
    //       action={{
    //         icon: pskHidden ? EyeIcon : EyeOffIcon,
    //         onClick: () => {
    //           setPskHidden(!pskHidden);
    //         }
    //       }}
    //       // error={errors.psk?.message}
    //       {...register("psk")}
    //     />
    //     <Controller
    //       name="uplinkEnabled"
    //       control={control}
    //       render={({ field: { value, ...rest } }) => (
    //         <>
    //           <Label>Uplink Enabled</Label>
    //           <Switch
    //             // label="Uplink Enabled"
    //             // description="Send packets to designated MQTT server"
    //             checked={value}
    //             {...rest}
    //           />
    //         </>
    //       )}
    //     />
    //     <Controller
    //       name="downlinkEnabled"
    //       control={control}
    //       render={({ field: { value, ...rest } }) => (
    //         <>
    //           <Label>Downlink Enabled</Label>
    //           <Switch
    //             // label="Downlink Enabled"
    //             // description="Recieve packets to designated MQTT server"
    //             checked={value}
    //             {...rest}
    //           />
    //         </>
    //       )}
    //     />
    //   </form>
    <DynamicForm<ChannelSettingsValidation>
      onSubmit={onSubmit}
      defaultValues={{
        enabled: [
          Protobuf.Channel_Role.SECONDARY,
          Protobuf.Channel_Role.PRIMARY
        ].find((role) => role === channel?.role)
          ? true
          : false,
        ...channel?.settings,
        psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0))
      }}
      fieldGroups={[
        {
          label: "Bluetooth Settings",
          description: "Settings for the Bluetooth module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Enabled",
              description: "Description"
            },
            {
              type: "password",
              name: "psk",
              label: "pre-Shared Key",
              description: "Description",

              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ],
              properties: {
                // act
              }
            },
            {
              type: "number",
              name: "channelNum",
              label: "Channel Number",
              description: "Description",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "text",
              name: "name",
              label: "Name",
              description: "Description",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "number",
              name: "id",
              label: "ID",
              description: "Description",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "uplinkEnabled",
              label: "Uplink Enabled",
              description: "Description",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "downlinkEnabled",
              label: "Downlink Enabled",
              description: "Description",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            }
          ]
        }
      ]}
    />
  );
};
