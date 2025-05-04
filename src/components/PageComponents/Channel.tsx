import type { ChannelValidation } from "@app/validation/channel.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";
import cryptoRandomString from "crypto-random-string";
import { useState } from "react";
import { PkiRegenerateDialog } from "../Dialog/PkiRegenerateDialog.tsx";

export interface SettingsPanelProps {
  channel: Protobuf.Channel.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps) => {
  const { config, connection, addChannel } = useDevice();
  const { toast } = useToast();

  const [pass, setPass] = useState<string>(
    fromByteArray(channel?.settings?.psk ?? new Uint8Array(0)),
  );
  const [bitCount, setBits] = useState<number>(
    channel?.settings?.psk.length ?? 16,
  );
  const [validationText, setValidationText] = useState<string>();
  const [preSharedDialogOpen, setPreSharedDialogOpen] = useState<boolean>(
    false,
  );

  const onSubmit = (data: ChannelValidation) => {
    const channel = create(Protobuf.Channel.ChannelSchema, {
      ...data,
      settings: {
        ...data.settings,
        psk: toByteArray(pass),
        moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
          ...data.settings.moduleSettings,
          positionPrecision: data.settings.moduleSettings.positionPrecision,
        }),
      },
    });
    connection?.setChannel(channel).then(() => {
      toast({
        title: `Saved Channel: ${channel.settings?.name}`,
      });
      addChannel(channel);
    });
  };

  const preSharedKeyRegenerate = () => {
    setPass(
      btoa(
        cryptoRandomString({
          length: bitCount ?? 0,
          type: "alphanumeric",
        }),
      ),
    );
    setValidationText(undefined);
    setPreSharedDialogOpen(false);
  };

  const preSharedClickEvent = () => {
    setPreSharedDialogOpen(true);
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
    <>
      <DynamicForm<ChannelValidation>
        onSubmit={onSubmit}
        submitType="onSubmit"
        hasSubmitButton
        defaultValues={{
          ...channel,
          ...{
            settings: {
              ...channel?.settings,
              psk: pass,
              moduleSettings: {
                ...channel?.settings?.moduleSettings,
                positionPrecision:
                  channel?.settings?.moduleSettings?.positionPrecision ===
                      undefined
                    ? 10
                    : channel?.settings?.moduleSettings?.positionPrecision,
              },
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
                  enumValue: channel.index === 0
                    ? { PRIMARY: 1 }
                    : { DISABLED: 0, SECONDARY: 2 },
                },
              },
              {
                type: "passwordGenerator",
                name: "settings.psk",
                id: "channel-psk",
                label: "Pre-Shared Key",
                description:
                  "Supported PSK lengths: 256-bit, 128-bit, 8-bit, Empty (0-bit)",
                validationText: validationText,
                devicePSKBitCount: bitCount ?? 0,
                inputChange: inputChangeEvent,
                selectChange: selectChangeEvent,
                actionButtons: [
                  {
                    text: "Generate",
                    variant: "success",
                    onClick: preSharedClickEvent,
                  },
                ],
                hide: true,
                properties: {
                  value: pass,
                  showPasswordToggle: true,
                  showCopyButton: true,
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
                type: "select",
                name: "settings.moduleSettings.positionPrecision",
                label: "Location",
                description:
                  "The precision of the location to share with the channel. Can be disabled.",
                properties: {
                  enumValue: config.display?.units === 0
                    ? {
                      "Do not share location": 0,
                      "Within 23 kilometers": 10,
                      "Within 12 kilometers": 11,
                      "Within 5.8 kilometers": 12,
                      "Within 2.9 kilometers": 13,
                      "Within 1.5 kilometers": 14,
                      "Within 700 meters": 15,
                      "Within 350 meters": 16,
                      "Within 200 meters": 17,
                      "Within 90 meters": 18,
                      "Within 50 meters": 19,
                      "Precise Location": 32,
                    }
                    : {
                      "Do not share location": 0,
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
                      "Precise Location": 32,
                    },
                },
              },
            ],
          },
        ]}
      />
      <PkiRegenerateDialog
        text={{
          button: "Regenerate",
          title: "Regenerate Pre-Shared Key?",
          description:
            "Are you sure you want to regenerate the pre-shared key?",
        }}
        open={preSharedDialogOpen}
        onOpenChange={() => setPreSharedDialogOpen(false)}
        onSubmit={() => preSharedKeyRegenerate()}
      />
    </>
  );
};
