import type { ChannelValidation } from "@app/validation/channel.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";
import cryptoRandomString from "crypto-random-string";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PkiRegenerateDialog } from "../Dialog/PkiRegenerateDialog.tsx";

export interface SettingsPanelProps {
  channel: Protobuf.Channel.Channel;
}

export const Channel = ({ channel }: SettingsPanelProps) => {
  const { config, connection, addChannel } = useDevice();
  const { t } = useTranslation();
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
        title: t("channel_form_toast_saved", {
          channelName: channel.settings?.name,
        }),
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
      setValidationText(
        t("channel_form_validation_psk_invalid", { bits: count * 8 }),
      );
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
            label: t("channel_form_field_group_settings_label"),
            description: t("channel_form_field_group_settings_description"),
            fields: [
              {
                type: "select",
                name: "role",
                label: t("channel_form_field_role_label"),
                disabled: channel.index === 0,
                description: t("channel_form_field_role_description"),
                properties: {
                  enumValue: channel.index === 0
                    ? { [t("channel_form_field_role_option_primary")]: 1 }
                    : {
                      [t("channel_form_field_role_option_disabled")]: 0,
                      [t("channel_form_field_role_option_secondary")]: 2,
                    },
                },
              },
              {
                type: "passwordGenerator",
                name: "settings.psk",
                id: "channel-psk",
                label: t("channel_form_field_psk_label"),
                description: t("channel_form_field_psk_description"),
                validationText: validationText,
                devicePSKBitCount: bitCount ?? 0,
                inputChange: inputChangeEvent,
                selectChange: selectChangeEvent,
                actionButtons: [
                  {
                    text: t("channel_form_field_psk_generate_button"),
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
                label: t("channel_form_field_name_label"),
                description: t("channel_form_field_name_description"),
              },
              {
                type: "toggle",
                name: "settings.uplinkEnabled",
                label: t("channel_form_field_uplink_enabled_label"),
                description: t("channel_form_field_uplink_enabled_description"),
              },
              {
                type: "toggle",
                name: "settings.downlinkEnabled",
                label: t("channel_form_field_downlink_enabled_label"),
                description: t(
                  "channel_form_field_downlink_enabled_description",
                ),
              },
              {
                type: "select",
                name: "settings.moduleSettings.positionPrecision",
                label: t("channel_form_field_position_precision_label"),
                description: t(
                  "channel_form_field_position_precision_description",
                ),
                properties: {
                  enumValue: config.display?.units === 0
                    ? {
                      [t("channel_form_field_position_precision_option_none")]:
                        0,
                      [
                        t("channel_form_field_position_precision_option_metric_km23")
                      ]: 10,
                      [
                        t("channel_form_field_position_precision_option_metric_km12")
                      ]: 11,
                      [
                        t("channel_form_field_position_precision_option_metric_km5_8")
                      ]: 12,
                      [
                        t("channel_form_field_position_precision_option_metric_km2_9")
                      ]: 13,
                      [
                        t("channel_form_field_position_precision_option_metric_km1_5")
                      ]: 14,
                      [
                        t("channel_form_field_position_precision_option_metric_m700")
                      ]: 15,
                      [
                        t("channel_form_field_position_precision_option_metric_m350")
                      ]: 16,
                      [
                        t("channel_form_field_position_precision_option_metric_m200")
                      ]: 17,
                      [
                        t("channel_form_field_position_precision_option_metric_m90")
                      ]: 18,
                      [
                        t("channel_form_field_position_precision_option_metric_m50")
                      ]: 19,
                      [
                        t("channel_form_field_position_precision_option_precise")
                      ]: 32,
                    }
                    : {
                      [t("channel_form_field_position_precision_option_none")]:
                        0,
                      [
                        t("channel_form_field_position_precision_option_imperial_mi15")
                      ]: 10,
                      [
                        t("channel_form_field_position_precision_option_imperial_mi7_3")
                      ]: 11,
                      [
                        t("channel_form_field_position_precision_option_imperial_mi3_6")
                      ]: 12,
                      [
                        t("channel_form_field_position_precision_option_imperial_mi1_8")
                      ]: 13,
                      [
                        t("channel_form_field_position_precision_option_imperial_mi0_9")
                      ]: 14,
                      [
                        t("channel_form_field_position_precision_option_imperial_mi0_5")
                      ]: 15,
                      [
                        t("channel_form_field_position_precision_option_imperial_mi0_2")
                      ]: 16,
                      [
                        t("channel_form_field_position_precision_option_imperial_ft600")
                      ]: 17,
                      [
                        t("channel_form_field_position_precision_option_imperial_ft300")
                      ]: 18,
                      [
                        t("channel_form_field_position_precision_option_imperial_ft150")
                      ]: 19,
                      [
                        t("channel_form_field_position_precision_option_precise")
                      ]: 32,
                    },
                },
              },
            ],
          },
        ]}
      />
      <PkiRegenerateDialog
        text={{
          button: t("dialog_pkiRegenerateDialog_buttonRegenerate"),
          title: t("dialog_pkiRegenerateDialog_title"),
          description: t("dialog_pkiRegenerateDialog_description"),
        }}
        open={preSharedDialogOpen}
        onOpenChange={() => setPreSharedDialogOpen(false)}
        onSubmit={() => preSharedKeyRegenerate()}
      />
    </>
  );
};
