import type{ ChannelValidation } from "@app/validation/channel.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useToast } from "@core/hooks/useToast.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";
import { fromByteArray, toByteArray } from "base64-js";

export interface SettingsPanelProps {
  channel: Protobuf.Channel.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps): JSX.Element => {
  const { config, connection, addChannel } = useDevice();
  const { toast } = useToast();

  const onSubmit = (data: ChannelValidation) => {
    const channel = new Protobuf.Channel.Channel({
      ...data,
      settings: {
        ...data.settings,
        psk: toByteArray(data.settings.psk ?? ""),
        moduleSettings: {
          positionPrecision: data.settings.positionEnabled ? data.settings.preciseLocation ? 32 : data.settings.positionPrecision : 0,
        }
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
            positionEnabled: channel?.settings?.moduleSettings?.positionPrecision != undefined && channel?.settings?.moduleSettings?.positionPrecision > 0,
            preciseLocation: channel?.settings?.moduleSettings?.positionPrecision == 32,
            positionPrecision: channel?.settings?.moduleSettings?.positionPrecision == undefined ? config.display?.units == 0 ? 23000 : 24140 : channel?.settings?.moduleSettings?.positionPrecision
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
              description:
                "Device telemetry is sent over PRIMARY. Only one PRIMARY allowed",
              properties: {
                enumValue: Protobuf.Channel.Channel_Role,
              },
            },
            {
              type: "password",
              name: "settings.psk",
              label: "pre-Shared Key",
              description: "16, or 32 bytes",
              properties: {
                // act
              },
            },
            {
              type: "text",
              name: "settings.name",
              label: "Name",
              description:
                "A unique name for the channel <12 bytes, leave blank for default",
            },
            {
              type: "toggle",
              name: "settings.uplinkEnabled",
              label: "Uplink Enabled",
              description: "Send messages from the local mesh to MQTT",
            },
            {
              type: "toggle",
              name: "settings.downlinkEnabled",
              label: "Downlink Enabled",
              description: "Send messages from MQTT to the local mesh",
            },
            {
              type: "toggle",
              name: "settings.positionEnabled",
              label: "Allow Position Requests",
              description: "Send position to channel",
            },
            {
              type: "toggle",
              name: "settings.preciseLocation",
              label: "Precise Location",
              description: "Send precise location to channel",
            },
            {
              type: "select",
              name: "settings.positionPrecision",
              label: "Approximate Location",
              description:
                "If not sharing precise location, position shared on channel will be accurate within this distance",
              properties: {
                enumValue: config.display?.units == 0 ?
                { "Within 23 km":23000, "Within 12 km":12000, "Within 5.8 km":5800, "Within 2.9 km":2900, "Within 1.5 km":1500, "Within 700 m":700, "Within 350 m":350, "Within 200 m":200, "Within 90 m":90, "Within 50 m":50 } :
                { "Within 15 miles":24140, "Within 7.3 miles":11748, "Within 3.6 miles":5793, "Within 1.8 miles":2896, "Within 0.9 miles":1448, "Within 0.5 miles":804, "Within 0.2 miles":321, "Within 600 feet":182, "Within 300 feet":91, "Within 150 feet":45 }
              },
            },
          ],
        },
      ]}
    />
  );
};
