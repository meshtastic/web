import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  beaconBroadcastGate,
  CONSERVATIVE_BEACON_PRESETS,
  fromMeshBeaconForm,
  type MeshBeaconValidation,
  MeshBeaconValidationSchema,
  OFFER_CHANNEL_KEEP,
  toMeshBeaconForm,
} from "@app/validation/moduleConfig/meshBeacon.ts";
import { getChannelName } from "@components/PageComponents/Channels/Channels.tsx";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useDevice } from "@core/stores";
import { channelSettingsByIndex } from "@core/utils/beaconJoin.ts";
import { getRegionPresetGroup } from "@core/utils/loraPresets.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useChannels, useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MeshBeaconTargets } from "./MeshBeaconTargets.tsx";

type MeshBeaconConfig = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig;

const Flags = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_Flags;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

interface MeshBeaconModuleConfigProps {
  onFormInit: DynamicFormFormInit<MeshBeaconValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { meshBeacon?: MeshBeaconConfig },
  peek: () => ({}) as { meshBeacon?: MeshBeaconConfig },
  subscribe: () => () => {},
} as const;

/**
 * Mesh Beacon settings in Android's three cards: the beacon itself, the
 * channel it offers, and the targets it is sent on. The region and the
 * offered preset are the radio's own, stamped in on save. See
 * fromMeshBeaconForm for the save rules and what firmware 2.8.1 needs.
 */
export const MeshBeacon = ({ onFormInit }: MeshBeaconModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "meshBeacon" });

  const { moduleConfig, getEffectiveModuleConfig, getEffectiveConfig } =
    useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.meshBeacon ??
    (getEffectiveModuleConfig("meshBeacon") as MeshBeaconConfig | undefined);
  const lora = getEffectiveConfig("lora") as
    | Protobuf.Config.Config_LoRaConfig
    | undefined;
  const channels = useChannels();
  const { regionPresets } = useDeviceCapabilities();
  const { t } = useTranslation("moduleConfig");

  const regionUnset = !lora || lora.region === Region.UNSET;
  const usePreset = lora?.usePreset ?? false;
  // Gated on what the radio has stored, so turning broadcast off in this
  // session can still be undone.
  const storedBroadcast =
    ((moduleConfig.meshBeacon?.flags ?? 0) & Flags.FLAG_BROADCAST_ENABLED) !==
    0;
  const gate = beaconBroadcastGate(usePreset, storedBroadcast);

  const channelsByIndex = useMemo(
    () => channelSettingsByIndex(channels),
    [channels],
  );
  const defaultValues = useMemo(
    () => toMeshBeaconForm(moduleConfig.meshBeacon, channelsByIndex, lora),
    [moduleConfig.meshBeacon, channelsByIndex, lora],
  );
  const values = useMemo(
    () => toMeshBeaconForm(effective, channelsByIndex, lora),
    [effective, channelsByIndex, lora],
  );

  // The radio's channels; the primary always, even unnamed.
  const channelOptions = useMemo(
    () =>
      channelsByIndex.flatMap((settings, index) =>
        settings
          ? [{ value: index, label: getChannelName({ index, settings }) }]
          : [],
      ),
    [channelsByIndex],
  );

  const offerChannelOptions = useMemo(() => {
    const options: Record<string, number> = {};
    for (const { value, label } of channelOptions) {
      options[`${value}: ${label}`] = value;
    }
    if (values.offerChannel === OFFER_CHANNEL_KEEP) {
      options[
        t("meshBeacon.offerChannel.keep", {
          name: effective?.broadcastOfferChannel?.name ?? "",
        })
      ] = OFFER_CHANNEL_KEEP;
    }
    return options;
  }, [t, values.offerChannel, effective, channelOptions]);

  const targetPresets = useMemo(
    () =>
      getRegionPresetGroup(regionPresets, lora?.region)?.presets ??
      CONSERVATIVE_BEACON_PRESETS,
    [regionPresets, lora?.region],
  );

  const onSubmit = (data: MeshBeaconValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "meshBeacon",
      fromMeshBeaconForm(
        data,
        effective,
        channelsByIndex,
        lora,
        moduleConfig.meshBeacon,
      ),
    );
  };

  if (regionUnset) {
    return (
      <DynamicForm<MeshBeaconValidation>
        onSubmit={() => {}}
        onFormInit={onFormInit}
        fieldGroups={[
          {
            label: t("meshBeacon.title"),
            description: t("meshBeacon.regionRequired"),
            fields: [],
          },
        ]}
      />
    );
  }

  const sectionsDisabled = !gate.sectionsEnabled;

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
          notes: usePreset ? undefined : t("meshBeacon.requiresPreset"),
          fields: [
            {
              type: "select",
              name: "region",
              label: t("meshBeacon.region.label"),
              description: t("meshBeacon.region.description"),
              disabled: true,
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_RegionCode,
              },
            },
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
              disabled: !gate.toggleEnabled,
            },
            ...(gate.sectionsVisible
              ? [
                  {
                    type: "text" as const,
                    name: "broadcastMessage" as const,
                    label: t("meshBeacon.broadcastMessage.label"),
                    description: t("meshBeacon.broadcastMessage.description"),
                    disabled: sectionsDisabled,
                  },
                  {
                    type: "number" as const,
                    name: "broadcastIntervalSecs" as const,
                    label: t("meshBeacon.broadcastIntervalSecs.label"),
                    description: t(
                      "meshBeacon.broadcastIntervalSecs.description",
                    ),
                    disabled: sectionsDisabled,
                    properties: { suffix: t("unit.second.plural") },
                  },
                ]
              : []),
          ],
        },
        ...(gate.sectionsVisible
          ? [
              {
                label: t("meshBeacon.offerChannel.groupLabel"),
                description: t("meshBeacon.offerChannel.groupDescription"),
                fields: [
                  {
                    type: "select" as const,
                    name: "offerChannel" as const,
                    label: t("meshBeacon.offerChannel.label"),
                    description: t("meshBeacon.offerChannel.description"),
                    disabled: sectionsDisabled,
                    properties: { enumValue: offerChannelOptions },
                  },
                ],
              },
              {
                label: t("meshBeacon.targets.label"),
                description: t("meshBeacon.targets.description"),
                fields: [],
                footer: (
                  <MeshBeaconTargets
                    onSubmit={onSubmit}
                    channelOptions={channelOptions}
                    presets={targetPresets}
                    currentPreset={lora?.modemPreset}
                    disabled={sectionsDisabled}
                  />
                ),
              },
            ]
          : []),
      ]}
    />
  );
};
