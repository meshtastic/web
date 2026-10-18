import { BeaconOffers } from "@app/components/PageComponents/Channels/BeaconOffers.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useDevice } from "@core/stores";
import { firmwareAtLeast, type Protobuf } from "@meshtastic/sdk";
import { useChannels, useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import i18next from "i18next";
import { PlusIcon, QrCodeIcon, UploadIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ChannelCard } from "./ChannelCard.tsx";
import { ChannelLegend } from "./ChannelLegend.tsx";
import {
  buildDisabledChannel,
  buildNewChannel,
  EXISTING_CHANNEL_PSK_STATE,
  enabledChannels,
  firstFreeIndex,
  generatePsk,
  locationSharingIndex,
  MAX_CHANNELS,
  NEW_CHANNEL_PSK_STATE,
  type PskEditState,
} from "./channelStaging.ts";
import { EditChannelDialog } from "./EditChannelDialog.tsx";

interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
}

export const getChannelName = (channel: {
  index: number;
  settings?: { name?: string };
}) => {
  return channel.settings?.name?.length
    ? channel.settings.name
    : channel.index === 0
      ? i18next.t("page.broadcastLabel", { ns: "channels" })
      : i18next.t("page.channelIndex", {
          ns: "channels",
          index: channel.index,
        });
};

type ChannelMap = ReadonlyMap<number, Protobuf.Channel.Channel>;

const EMPTY_CHANNELS_SIGNAL = {
  value: new Map() as ChannelMap,
  peek: () => new Map() as ChannelMap,
  subscribe: () => () => {},
} as const;

const EMPTY_DIRTY_CHANNELS_SIGNAL = {
  value: [] as readonly number[],
  peek: () => [] as readonly number[],
  subscribe: () => () => {},
} as const;

const EMPTY_RADIO_SIGNAL = {
  value: {} as { lora?: Protobuf.Config.Config_LoRaConfig },
  peek: () => ({}) as { lora?: Protobuf.Config.Config_LoRaConfig },
  subscribe: () => () => {},
} as const;

/** Firmware that can broadcast position on a secondary channel. */
const SECONDARY_CHANNEL_LOCATION_FIRMWARE = "2.6.10";

interface Editing {
  channel: Protobuf.Channel.Channel;
  isNew: boolean;
  pskState: PskEditState;
}

/**
 * The Channels settings page, laid out like Android's ChannelConfigScreen:
 * a header, a Primary/Secondary legend, one card per enabled channel and an
 * "Add channel" button. Edits are staged in the config editor by channel
 * index and sent with the page's Save.
 *
 * Channels can't be reordered: chat history is keyed by channel index, so
 * moving a channel would attach its messages to another one.
 */
export const Channels = ({ onFormInit }: ConfigProps) => {
  const { t } = useTranslation("channels");
  const { setDialogOpen, config } = useDevice();
  const { metadata } = useDeviceCapabilities();
  const editor = useConfigEditor();
  const deviceChannels = useChannels();
  const workingChannels = useSignal(editor?.channels ?? EMPTY_CHANNELS_SIGNAL);
  const dirtyChannels = useSignal(
    editor?.dirtyChannels ?? EMPTY_DIRTY_CHANNELS_SIGNAL,
  );
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO_SIGNAL);
  const lora = radio.lora ?? config.lora;
  const [editing, setEditing] = useState<Editing | undefined>();

  // The page has no form of its own: edits are staged from the dialog. Give
  // Settings a stable empty form so Save only depends on the editor's state.
  const pageForm = useForm();
  useEffect(() => {
    onFormInit(pageForm);
  }, [onFormInit, pageForm]);

  // The editor's working copy, falling back to the device's channels before
  // the editor has seen them.
  const channels: ChannelMap = useMemo(() => {
    if (workingChannels.size > 0) return workingChannels;
    return new Map(
      deviceChannels.map((c) => [
        c.index,
        { ...c, $typeName: "meshtastic.Channel" } as Protobuf.Channel.Channel,
      ]),
    );
  }, [workingChannels, deviceChannels]);

  const listed = useMemo(() => enabledChannels(channels.values()), [channels]);
  const supportsSecondaryChannelLocation = firmwareAtLeast(
    metadata?.firmwareVersion ?? "",
    SECONDARY_CHANNEL_LOCATION_FIRMWARE,
  );
  const sharingIndex = locationSharingIndex(
    listed,
    supportsSecondaryChannelLocation,
  );
  const freeIndex = firstFreeIndex(channels);
  const canAdd =
    editor !== undefined &&
    listed.length < MAX_CHANNELS &&
    freeIndex !== undefined;
  const metric = config.display?.units === 0;

  const slot = lora?.channelNum ?? 0;
  const overrideFrequency = lora?.overrideFrequency ?? 0;

  const addChannel = () => {
    if (freeIndex === undefined) return;
    setEditing({
      channel: buildNewChannel(freeIndex, generatePsk()),
      isNew: true,
      pskState: NEW_CHANNEL_PSK_STATE,
    });
  };

  return (
    <div className="flex flex-col gap-4 max-md:px-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-lg font-semibold">{t("page.sectionLabel")}</h3>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {overrideFrequency > 0 && (
              <p>{t("header.frequency", { frequency: overrideFrequency })}</p>
            )}
            <p>
              {slot > 0 ? t("header.slot", { slot }) : t("header.slotAuto")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen("import", true)}
          >
            <UploadIcon className="mr-2" size={14} />
            {t("page.import")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen("QR", true)}
          >
            <QrCodeIcon className="mr-2" size={14} />
            {t("page.export")}
          </Button>
        </div>
      </div>

      <BeaconOffers />

      <ChannelLegend
        supportsSecondaryChannelLocation={supportsSecondaryChannelLocation}
      />

      <ul className="flex flex-col gap-2" aria-label={t("page.sectionLabel")}>
        {listed.map((channel) => {
          const title = getChannelName(channel);
          return (
            <ChannelCard
              key={channel.index}
              channel={channel}
              title={title}
              sharesLocation={sharingIndex === channel.index}
              dirty={dirtyChannels.includes(channel.index)}
              onEdit={() =>
                setEditing({
                  channel,
                  isNew: false,
                  pskState: EXISTING_CHANNEL_PSK_STATE,
                })
              }
              onDelete={
                channel.index === 0 || !editor
                  ? undefined
                  : () => editor.setChannel(buildDisabledChannel(channel.index))
              }
            />
          );
        })}
      </ul>

      {canAdd && (
        <Button variant="outline" className="self-start" onClick={addChannel}>
          <PlusIcon className="mr-2" size={16} />
          {t("list.add")}
        </Button>
      )}

      {editing && editor && (
        <EditChannelDialog
          key={`${editing.channel.index}-${editing.isNew}`}
          channel={editing.channel}
          isNew={editing.isNew}
          initialPskState={editing.pskState}
          defaultName={getChannelName({ index: editing.channel.index })}
          metric={metric}
          onClose={() => setEditing(undefined)}
          onSave={(channel) => {
            editor.setChannel(channel);
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
};
