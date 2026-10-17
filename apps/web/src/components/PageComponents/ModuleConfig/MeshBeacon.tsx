import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  fromMeshBeaconForm,
  type MeshBeaconValidation,
  MeshBeaconValidationSchema,
  OFFER_CHANNEL_KEEP,
  OFFER_CHANNEL_NONE,
  OFFER_PRESET_UNSET,
  toMeshBeaconForm,
} from "@app/validation/moduleConfig/meshBeacon.ts";
import { getChannelName } from "@components/PageComponents/Channels/Channels.tsx";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { channelSettingsByIndex } from "@core/utils/beaconJoin.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useChannels, useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type MeshBeaconConfig = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig;

interface MeshBeaconModuleConfigProps {
  onFormInit: DynamicFormFormInit<MeshBeaconValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { meshBeacon?: MeshBeaconConfig },
  peek: () => ({}) as { meshBeacon?: MeshBeaconConfig },
  subscribe: () => () => {},
} as const;

/**
 * Mesh Beacon settings, limited to what firmware 2.8.1 understands. The
 * frequency slot fields in the vendored protobufs came later and are left
 * out. Broadcast targets have no editor here and are kept as they are.
 */
export const MeshBeacon = ({ onFormInit }: MeshBeaconModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "meshBeacon" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.meshBeacon ??
    (getEffectiveModuleConfig("meshBeacon") as MeshBeaconConfig | undefined);
  const channels = useChannels();
  const { t } = useTranslation("moduleConfig");

  const channelsByIndex = useMemo(
    () => channelSettingsByIndex(channels),
    [channels],
  );
  const defaultValues = useMemo(
    () => toMeshBeaconForm(moduleConfig.meshBeacon, channelsByIndex),
    [moduleConfig.meshBeacon, channelsByIndex],
  );
  const values = useMemo(
    () => toMeshBeaconForm(effective, channelsByIndex),
    [effective, channelsByIndex],
  );

  const offerChannelOptions = useMemo(() => {
    const options: Record<string, number> = {
      [t("meshBeacon.offerChannel.none")]: OFFER_CHANNEL_NONE,
    };
    if (values.offerChannel === OFFER_CHANNEL_KEEP) {
      options[
        t("meshBeacon.offerChannel.keep", {
          name: effective?.broadcastOfferChannel?.name ?? "",
        })
      ] = OFFER_CHANNEL_KEEP;
    }
    channelsByIndex.forEach((settings, index) => {
      if (!settings) return;
      const name = getChannelName({ index, settings });
      options[`${index}: ${name}`] = index;
    });
    return options;
  }, [t, values.offerChannel, effective, channelsByIndex]);

  const offerPresetOptions = useMemo(
    () => ({
      [t("meshBeacon.broadcastOfferPreset.unset")]: OFFER_PRESET_UNSET,
      ...Protobuf.Config.Config_LoRaConfig_ModemPreset,
    }),
    [t],
  );

  const onSubmit = (data: MeshBeaconValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "meshBeacon",
      fromMeshBeaconForm(data, effective, channelsByIndex),
    );
  };

  const broadcastOff = [{ fieldName: "broadcastEnabled" as const }];

  return (
    <DynamicForm<MeshBeaconValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={MeshBeaconValidationSchema}
      defaultValues={defaultValues}
      values={values}
      fieldGroups={[
        {
          label: t("meshBeacon.title"),
          description: t("meshBeacon.description"),
          fields: [
            {
              type: "toggle",
              name: "listenEnabled",
              label: t("meshBeacon.listenEnabled.label"),
              description: t("meshBeacon.listenEnabled.description"),
            },
            {
              type: "toggle",
              name: "broadcastEnabled",
              label: t("meshBeacon.broadcastEnabled.label"),
              description: t("meshBeacon.broadcastEnabled.description"),
            },
          ],
        },
        {
          label: t("meshBeacon.broadcast.label"),
          description: t("meshBeacon.broadcast.description"),
          fields: [
            {
              type: "text",
              name: "broadcastMessage",
              label: t("meshBeacon.broadcastMessage.label"),
              description: t("meshBeacon.broadcastMessage.description"),
              disabledBy: broadcastOff,
            },
            {
              type: "number",
              name: "broadcastIntervalSecs",
              label: t("meshBeacon.broadcastIntervalSecs.label"),
              description: t("meshBeacon.broadcastIntervalSecs.description"),
              disabledBy: broadcastOff,
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "toggle",
              name: "legacySplit",
              label: t("meshBeacon.legacySplit.label"),
              description: t("meshBeacon.legacySplit.description"),
              disabledBy: broadcastOff,
            },
            {
              type: "select",
              name: "offerChannel",
              label: t("meshBeacon.offerChannel.label"),
              description: t("meshBeacon.offerChannel.description"),
              disabledBy: broadcastOff,
              properties: { enumValue: offerChannelOptions },
            },
            {
              type: "select",
              name: "broadcastOfferPreset",
              label: t("meshBeacon.broadcastOfferPreset.label"),
              description: t("meshBeacon.broadcastOfferPreset.description"),
              disabledBy: broadcastOff,
              properties: {
                enumValue: offerPresetOptions,
                formatEnumName: true,
              },
            },
            {
              type: "select",
              name: "broadcastOfferRegion",
              label: t("meshBeacon.broadcastOfferRegion.label"),
              description: t("meshBeacon.broadcastOfferRegion.description"),
              disabledBy: broadcastOff,
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_RegionCode,
              },
            },
          ],
        },
      ]}
    />
  );
};
