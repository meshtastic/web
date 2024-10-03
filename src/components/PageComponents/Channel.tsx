import type { ChannelValidation } from "@app/validation/channel.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useToast } from "@core/hooks/useToast.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";
import { fromByteArray, toByteArray } from "base64-js";
import cryptoRandomString from "crypto-random-string";
import { useState } from "react";

export interface SettingsPanelProps {
  channel: Protobuf.Channel.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps): JSX.Element => {
  const { config, connection, addChannel } = useDevice();
  const { toast } = useToast();

  const [pass, setPass] = useState<string>(
    fromByteArray(channel?.settings?.psk ?? new Uint8Array(0)),
  );
  const [bitCount, setBits] = useState<number>(
    channel?.settings?.psk.length ?? 16,
  );
  const [validationText, setValidationText] = useState<string>();

  const onSubmit = (data: ChannelValidation) => {
    const channel = new Protobuf.Channel.Channel({
      ...data,
      settings: {
        ...data.settings,
        psk: toByteArray(pass),
        moduleSettings: {
          positionPrecision: data.settings.positionEnabled
            ? data.settings.preciseLocation
              ? 32
              : data.settings.positionPrecision
            : 0,
        },
      },
    });
    connection?.setChannel(channel).then(() => {
      toast({
        title: `Saved Channel: ${channel.settings?.name}`,
      });
      addChannel(channel);
    });
  };

  const clickEvent = () => {
    setPass(
      btoa(
        cryptoRandomString({
          length: bitCount ?? 0,
          type: "alphanumeric",
        }),
      ),
    );
    setValidationText(undefined);
  };

  const validatePass = (input: string, count: number) => {
    if (input.length % 4 !== 0 || toByteArray(input).length !== count) {
      setValidationText(`Please enter a valid ${count * 8} bit PSK.`);
    } else {
      setValidationText(undefined);
    }
  };

  const inputChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const psk = e.currentTarget?.value;
    setPass(psk);
    validatePass(psk, bitCount);
  };

  const selectChangeEvent = (e: string) => {
    const count = Number.parseInt(e);
    setBits(count);
    validatePass(pass, count);
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
            psk: pass,
            positionEnabled:
              channel?.settings?.moduleSettings?.positionPrecision !==
                undefined &&
              channel?.settings?.moduleSettings?.positionPrecision > 0,
            preciseLocation:
              channel?.settings?.moduleSettings?.positionPrecision === 32,
            positionPrecision:
              channel?.settings?.moduleSettings?.positionPrecision === undefined
                ? 10
                : channel?.settings?.moduleSettings?.positionPrecision,
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
              disabled: channel.index === 0,
              description:
                "Device telemetry is sent over PRIMARY. Only one PRIMARY allowed",
              properties: {
                enumValue:
                  channel.index === 0
                    ? { PRIMARY: 1 }
                    : { DISABLED: 0, SECONDARY: 2 },
              },
            },
            {
              type: "passwordGenerator",
              name: "settings.psk",
              label: "pre-Shared Key",
              description: "256, 128, or 8 bit PSKs allowed",
              validationText: validationText,
              devicePSKBitCount: bitCount ?? 0,
              inputChange: inputChangeEvent,
              selectChange: selectChangeEvent,
              buttonClick: clickEvent,
              hide: true,
              properties: {
                value: pass,
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
                enumValue:
                  config.display?.units === 0
                    ? {
                        "Within 23 km": 10,
                        "Within 12 km": 11,
                        "Within 5.8 km": 12,
                        "Within 2.9 km": 13,
                        "Within 1.5 km": 14,
                        "Within 700 m": 15,
                        "Within 350 m": 16,
                        "Within 200 m": 17,
                        "Within 90 m": 18,
                        "Within 50 m": 19,
                      }
                    : {
                        "Within 15 miles": 10,
                        "Within 7.3 miles": 11,
                        "Within 3.6 miles": 12,
                        "Within 1.8 miles": 13,
                        "Within 0.9 miles": 14,
                        "Within 0.5 miles": 15,
                        "Within 0.2 miles": 16,
                        "Within 600 feet": 17,
                        "Within 300 feet": 18,
                        "Within 150 feet": 19,
                      },
              },
            },
          ],
        },
      ]}
    />
  );
};
