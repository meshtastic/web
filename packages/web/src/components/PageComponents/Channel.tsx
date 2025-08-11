import { makeChannelSchema } from "@app/validation/channel.ts";
import { create } from "@bufbuild/protobuf";
import { PkiRegenerateDialog } from "@components/Dialog/PkiRegenerateDialog.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";
import cryptoRandomString from "crypto-random-string";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { infer as zodInfer } from "zod/v4";

export interface SettingsPanelProps {
  channel: Protobuf.Channel.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps) => {
  const { config, connection, addChannel } = useDevice();
  const { t } = useTranslation(["channels", "ui", "dialog"]);
  const { toast } = useToast();

  const [preSharedDialogOpen, setPreSharedDialogOpen] =
    useState<boolean>(false);
  const [pass, setPass] = useState<string>(
    fromByteArray(channel?.settings?.psk ?? new Uint8Array(0)),
  );
  const [byteCount, setBytes] = useState<number>(
    channel?.settings?.psk.length ?? 16,
  );

  const ChannelValidationSchema = useMemo(() => {
    return makeChannelSchema(byteCount);
  }, [byteCount]);

  type ChannelValidation = zodInfer<typeof ChannelValidationSchema>;

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
      console.debug(
        t("toast.savedChannel.title", {
          ns: "ui",
          channelName: channel.settings?.name,
        }),
      );
      toast({
        title: t("toast.savedChannel.title", {
          ns: "ui",
          channelName: channel.settings?.name,
        }),
      });
      addChannel(channel);
    });
  };

  const preSharedKeyRegenerate = () => {
    const newPsk = btoa(
      cryptoRandomString({
        length: byteCount ?? 0,
        type: "alphanumeric",
      }),
    );
    setPass(newPsk);

    setPreSharedDialogOpen(false);
  };

  const preSharedClickEvent = () => {
    setPreSharedDialogOpen(true);
  };

  const inputChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPass(e.currentTarget?.value);
  };

  const selectChangeEvent = (e: string) => {
    const count = Number.parseInt(e);
    setBytes(count);
  };

  return (
    <>
      <DynamicForm<ChannelValidation>
        onSubmit={onSubmit}
        submitType="onSubmit"
        validationSchema={ChannelValidationSchema}
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
            label: t("settings.label"),
            description: t("settings.description"),
            fields: [
              {
                type: "select",
                name: "role",
                label: t("role.label"),
                disabled: channel.index === 0,
                description: t("role.description"),
                properties: {
                  enumValue:
                    channel.index === 0
                      ? { [t("role.options.primary")]: 1 }
                      : {
                          [t("role.options.disabled")]: 0,
                          [t("role.options.secondary")]: 2,
                        },
                },
              },
              {
                type: "passwordGenerator",
                name: "settings.psk",
                id: "channel-psk",
                label: t("psk.label"),
                description: t("psk.description"),
                devicePSKBitCount: byteCount ?? 0,
                inputChange: inputChangeEvent,
                selectChange: selectChangeEvent,
                actionButtons: [
                  {
                    text: t("psk.generate"),
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
                label: t("name.label"),
                description: t("name.description"),
              },
              {
                type: "toggle",
                name: "settings.uplinkEnabled",
                label: t("uplinkEnabled.label"),
                description: t("uplinkEnabled.description"),
              },
              {
                type: "toggle",
                name: "settings.downlinkEnabled",
                label: t("downlinkEnabled.label"),
                description: t("downlinkEnabled.description"),
              },
              {
                type: "select",
                name: "settings.moduleSettings.positionPrecision",
                label: t("positionPrecision.label"),
                description: t("positionPrecision.description"),
                properties: {
                  enumValue:
                    config.display?.units === 0
                      ? {
                          [t("positionPrecision.options.none")]: 0,
                          [t("positionPrecision.options.metric_km23")]: 10,
                          [t("positionPrecision.options.metric_km12")]: 11,
                          [t("positionPrecision.options.metric_km5_8")]: 12,
                          [t("positionPrecision.options.metric_km2_9")]: 13,
                          [t("positionPrecision.options.metric_km1_5")]: 14,
                          [t("positionPrecision.options.metric_m700")]: 15,
                          [t("positionPrecision.options.metric_m350")]: 16,
                          [t("positionPrecision.options.metric_m200")]: 17,
                          [t("positionPrecision.options.metric_m90")]: 18,
                          [t("positionPrecision.options.metric_m50")]: 19,
                          [t("positionPrecision.options.precise")]: 32,
                        }
                      : {
                          [t("positionPrecision.options.none")]: 0,
                          [t("positionPrecision.options.imperial_mi15")]: 10,
                          [t("positionPrecision.options.imperial_mi7_3")]: 11,
                          [t("positionPrecision.options.imperial_mi3_6")]: 12,
                          [t("positionPrecision.options.imperial_mi1_8")]: 13,
                          [t("positionPrecision.options.imperial_mi0_9")]: 14,
                          [t("positionPrecision.options.imperial_mi0_5")]: 15,
                          [t("positionPrecision.options.imperial_mi0_2")]: 16,
                          [t("positionPrecision.options.imperial_ft600")]: 17,
                          [t("positionPrecision.options.imperial_ft300")]: 18,
                          [t("positionPrecision.options.imperial_ft150")]: 19,
                          [t("positionPrecision.options.precise")]: 32,
                        },
                },
              },
            ],
          },
        ]}
      />
      <PkiRegenerateDialog
        text={{
          button: t("pkiRegenerateDialog.regenerate", { ns: "dialog" }),
          title: t("pkiRegenerateDialog.title", { ns: "dialog" }),
          description: t("pkiRegenerateDialog.description", { ns: "dialog" }),
        }}
        open={preSharedDialogOpen}
        onOpenChange={() => setPreSharedDialogOpen(false)}
        onSubmit={() => preSharedKeyRegenerate()}
      />
    </>
  );
};
