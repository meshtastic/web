import type { ChannelValidation } from "@app/validation/channel.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useToast } from "@core/hooks/useToast.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { fromByteArray, toByteArray } from "base64-js";

export interface SettingsPanelProps {
  channel: Protobuf.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps): JSX.Element => {
  const { connection, addChannel } = useDevice();
  const { toast } = useToast();

  const onSubmit = (data: ChannelValidation) => {
    const channel = new Protobuf.Channel({
      ...data,
      settings: {
        ...data.settings,
        psk: toByteArray(data.settings.psk ?? ""),
      },
    });
    connection?.setChannel(channel).then(() => {
      toast({
        title: `Saved Channel: ${channel.settings?.name}`,
      });
      addChannel(channel);
    });
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
            psk: fromByteArray(channel?.settings?.psk ?? new Uint8Array(0)),
          },
        },
      }}
      fieldGroups={[
        {
          label: "Channel Settings",
          description: "Crypto, MQTT & misc settings",
          fields: [
            {
              type: "select",
              name: "role",
              label: "Role",
              description: "Description",
              properties: {
                enumValue: Protobuf.Channel_Role,
              },
            },
            {
              type: "password",
              name: "settings.psk",
              label: "pre-Shared Key",
              description: "Description",
              properties: {
                // act
              },
            },
            {
              type: "number",
              name: "settings.channelNum",
              label: "Channel Number",
              description: "Description",
            },
            {
              type: "text",
              name: "settings.name",
              label: "Name",
              description: "Description",
            },
            {
              type: "number",
              name: "settings.id",
              label: "ID",
              description: "Description",
            },
            {
              type: "toggle",
              name: "settings.uplinkEnabled",
              label: "Uplink Enabled",
              description: "Description",
            },
            {
              type: "toggle",
              name: "settings.downlinkEnabled",
              label: "Downlink Enabled",
              description: "Description",
            },
          ],
        },
      ]}
    />
  );
};
