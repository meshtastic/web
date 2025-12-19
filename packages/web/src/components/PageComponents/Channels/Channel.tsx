import type { Channel as DbChannel } from "@data/index";
import type { ChannelValidation } from "@app/validation/channel";
import { PkiRegenerateDialog } from "@components/Dialog/PkiRegenerateDialog";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@features/settings/components/form/ConfigFormFields";
import { useDevice } from "@core/stores";
import { useChannelForm } from "@features/settings/hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface SettingsPanelProps {
  channel: DbChannel;
}

export const Channel = ({ channel }: SettingsPanelProps) => {
  const { config } = useDevice();
  const { t } = useTranslation(["channels", "ui", "dialog"]);
  const [preSharedDialogOpen, setPreSharedDialogOpen] = useState(false);

  const {
    form,
    isDisabledByField,
    byteCount,
    handleByteCountChange,
    regeneratePsk,
    channelIndex,
  } = useChannelForm({ channel });

  const fieldGroups: FieldGroup<ChannelValidation>[] = [
    {
      label: t("settings.label"),
      description: t("settings.description"),
      fields: [
        {
          type: "select",
          name: "role",
          label: t("role.label"),
          description: t("role.description"),
          disabled: channelIndex === 0,
          properties: {
            enumValue:
              channelIndex === 0
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
          label: t("psk.label"),
          description: t("psk.description"),
          passwordGenerator: {
            id: "channel-psk",
            hide: true,
            devicePSKBitCount: byteCount,
            selectChange: handleByteCountChange,
            actionButtons: [
              {
                text: t("psk.generate"),
                variant: "success",
                onClick: () => setPreSharedDialogOpen(true),
              },
            ],
          },
          properties: {
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
  ];

  return (
    <>
      <ConfigFormFields
        form={form}
        fieldGroups={fieldGroups}
        isDisabledByField={isDisabledByField}
      />
      <PkiRegenerateDialog
        text={{
          button: t("pkiRegenerateDialog.regenerate", { ns: "dialog" }),
          title: t("pkiRegenerateDialog.title", { ns: "dialog" }),
          description: t("pkiRegenerateDialog.description", { ns: "dialog" }),
        }}
        open={preSharedDialogOpen}
        onOpenChange={() => setPreSharedDialogOpen(false)}
        onSubmit={async () => {
          await regeneratePsk();
          setPreSharedDialogOpen(false);
        }}
      />
    </>
  );
};
