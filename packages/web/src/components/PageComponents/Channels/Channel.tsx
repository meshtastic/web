import {
  type ChannelValidation,
  makeChannelSchema,
} from "@app/validation/channel.ts";
import { create } from "@bufbuild/protobuf";
import { PkiRegenerateDialog } from "@components/Dialog/PkiRegenerateDialog.tsx";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";
import cryptoRandomString from "crypto-random-string";
import { useEffect, useMemo, useRef, useState } from "react";
import { type DefaultValues, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export interface SettingsPanelProps {
  onFormInit: DynamicFormFormInit<ChannelValidation>;
  channel: Protobuf.Channel.Channel;
}

export const Channel = ({ onFormInit, channel }: SettingsPanelProps) => {
  const { config, setChange, getChange, removeChange } = useDevice();
  const { t } = useTranslation(["channels", "ui", "dialog"]);

  const defaultConfig = channel;
  const defaultValues = {
    ...defaultConfig,
    ...{
      settings: {
        ...defaultConfig?.settings,
        psk: fromByteArray(defaultConfig?.settings?.psk ?? new Uint8Array(0)),
        moduleSettings: {
          ...defaultConfig?.settings?.moduleSettings,
          positionPrecision:
            defaultConfig?.settings?.moduleSettings?.positionPrecision ===
            undefined
              ? 10
              : defaultConfig?.settings?.moduleSettings?.positionPrecision,
        },
      },
    },
  };

  const workingChannel = getChange({
    type: "channels",
    index: channel.index,
  }) as Protobuf.Channel.Channel | undefined;
  const effectiveConfig = workingChannel ?? channel;
  const formValues = {
    ...effectiveConfig,
    ...{
      settings: {
        ...effectiveConfig?.settings,
        psk: fromByteArray(effectiveConfig?.settings?.psk ?? new Uint8Array(0)),
        moduleSettings: {
          ...effectiveConfig?.settings?.moduleSettings,
          positionPrecision:
            effectiveConfig?.settings?.moduleSettings?.positionPrecision ===
            undefined
              ? 10
              : effectiveConfig?.settings?.moduleSettings?.positionPrecision,
        },
      },
    },
  };

  const [preSharedDialogOpen, setPreSharedDialogOpen] =
    useState<boolean>(false);
  const [byteCount, setBytes] = useState<number>(
    effectiveConfig?.settings?.psk.length ?? 16,
  );
  const ChannelValidationSchema = useMemo(() => {
    return makeChannelSchema(byteCount);
  }, [byteCount]);

  const formMethods = useForm<ChannelValidation>({
    mode: "onChange",
    defaultValues: defaultValues as DefaultValues<ChannelValidation>,
    resolver: createZodResolver(ChannelValidationSchema),
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values: formValues as ChannelValidation,
  });
  const { setValue, trigger, handleSubmit, formState } = formMethods;

  useEffect(() => {
    onFormInit?.(formMethods);
  }, [onFormInit, formMethods]);

  // Since byteCount is an independent state, we need to use the effective value
  // from the channel config to ensure the form updates when the setting changes
  const effectiveByteCount = effectiveConfig.settings?.psk.length ?? 16;
  const lastEffectiveRef = useRef<number>(effectiveByteCount);
  useEffect(() => {
    if (effectiveByteCount !== lastEffectiveRef.current) {
      lastEffectiveRef.current = effectiveByteCount;

      setBytes(effectiveByteCount);
      trigger("settings.psk");
    }
  }, [effectiveByteCount, trigger]);

  const onSubmit = (data: ChannelValidation) => {
    if (!formState.isReady) {
      return;
    }

    const payload = create(Protobuf.Channel.ChannelSchema, {
      ...data,
      settings: {
        ...data.settings,
        psk: toByteArray(data.settings.psk),
        moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
          ...data.settings.moduleSettings,
          positionPrecision: data.settings.moduleSettings.positionPrecision,
        }),
      },
    });

    if (deepCompareConfig(channel, payload, true)) {
      removeChange({ type: "channels", index: channel.index });
      return;
    }

    setChange({ type: "channels", index: channel.index }, payload, channel);
  };

  const preSharedKeyRegenerate = async () => {
    const newPsk = btoa(
      cryptoRandomString({
        length: byteCount ?? 16,
        type: "alphanumeric",
      }),
    );
    setValue("settings.psk", newPsk, { shouldDirty: true });
    setPreSharedDialogOpen(false);

    const valid = await trigger("settings.psk");
    if (valid) {
      handleSubmit(onSubmit)(); // manually invoke form submit
    }
  };

  const selectChangeEvent = (e: string) => {
    const count = Number.parseInt(e, 10);
    if (!Number.isNaN(count)) {
      setBytes(count);
      trigger("settings.psk");
    }
  };

  return (
    <>
      <DynamicForm<ChannelValidation>
        propMethods={formMethods}
        onSubmit={onSubmit}
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
                devicePSKBitCount: byteCount ?? 16,
                selectChange: selectChangeEvent,
                actionButtons: [
                  {
                    text: t("psk.generate"),
                    variant: "success",
                    onClick: () => setPreSharedDialogOpen(true),
                  },
                ],
                hide: true,
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
