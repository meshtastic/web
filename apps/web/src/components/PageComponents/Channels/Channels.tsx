import { BeaconOffers } from "@app/components/PageComponents/Channels/BeaconOffers.tsx";
import { ConfirmDialog } from "@components/UI/ConfirmDialog.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import { channelLabel } from "@core/channels/channelLabel.ts";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useChannels, useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import type { Protobuf } from "@core/protobuf.ts";
import { useDevice } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { firmwareAtLeast } from "@core/utils/firmware.ts";
import { MapPinIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ChannelEditor } from "./ChannelEditor.tsx";
import { ChannelLegend } from "./ChannelLegend.tsx";
import { ChannelShareCard } from "./ChannelShareCard.tsx";
import { slotRole, slotSummaries } from "./channelSlots.ts";
import { locationSharingIndex } from "./channelStaging.ts";

interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
}

type ChannelLike = Pick<Protobuf.Channel.Channel, "index" | "role"> & {
  settings?: Protobuf.Channel.ChannelSettings;
};
type ChannelMap = ReadonlyMap<number, ChannelLike>;

const EMPTY_CHANNELS = constantSignal<
  ReadonlyMap<number, Protobuf.Channel.Channel>
>(new Map());
const EMPTY_DIRTY = constantSignal<readonly number[]>([]);
const EMPTY_RADIO = constantSignal<{
  lora?: Protobuf.Config.Config_LoRaConfig;
}>({});

/** Firmware that can broadcast position on a secondary channel. */
const SECONDARY_CHANNEL_LOCATION_FIRMWARE = "2.6.10";

/**
 * The Channels settings page: the eight slots on the left, the selected
 * channel's QR share card beside them and its editor below. Edits are staged
 * in the config editor by slot and sent with the page's Save.
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
  const workingChannels = useSignal(editor?.channels ?? EMPTY_CHANNELS);
  const dirtyChannels = useSignal(editor?.dirtyChannels ?? EMPTY_DIRTY);
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO);
  const lora = radio.lora ?? config.lora;
  const [selected, setSelected] = useState(0);
  // An invalid edit isn't staged, so switching slots would drop it: ask.
  const [editorInvalid, setEditorInvalid] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<number>();
  const selectSlot = (index: number) => {
    if (index === selected) return;
    if (editorInvalid) {
      setPendingSlot(index);
      return;
    }
    setSelected(index);
  };

  const onRadio: ChannelMap = useMemo(
    () => new Map(deviceChannels.map((c) => [c.index, c])),
    [deviceChannels],
  );
  // The editor's working copy, falling back to the radio's channels before
  // the editor has seen them.
  const channels: ChannelMap =
    workingChannels.size > 0 ? workingChannels : onRadio;

  const slots = slotSummaries(channels);
  const supportsSecondaryChannelLocation = firmwareAtLeast(
    metadata?.firmwareVersion ?? "",
    SECONDARY_CHANNEL_LOCATION_FIRMWARE,
  );
  const sharingIndex = locationSharingIndex(
    channels.values(),
    supportsSecondaryChannelLocation,
  );
  const metric = config.display?.units === 0;
  const loraSlot = lora?.channelNum ?? 0;
  const overrideFrequency = lora?.overrideFrequency ?? 0;

  const selectedChannel = channels.get(selected);
  const radioChannel = onRadio.get(selected);
  const defaultName = channelLabel({ index: selected }, t);
  const selectedName = channelLabel(
    { index: selected, name: selectedChannel?.settings?.name },
    t,
  );

  return (
    <div className="flex flex-col gap-5">
      <BeaconOffers />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-2 md:flex-[0_0_220px]">
          <ul
            aria-label={t("slots.listLabel")}
            className="m-0 flex list-none flex-col rounded-card border border-subtle bg-surface p-1.5"
          >
            {slots.map((slot) => {
              const active = slot.index === selected;
              const empty = slot.role === "disabled";
              const label = empty
                ? t("slots.empty")
                : (slot.name ?? channelLabel({ index: slot.index }, t));
              return (
                <li key={slot.index}>
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => selectSlot(slot.index)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2 py-2 text-left hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      active && "bg-selected",
                    )}
                  >
                    <span className="w-5 flex-none text-meta text-muted">
                      {slot.index}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={cn(
                          "truncate font-medium",
                          empty && "text-muted",
                        )}
                      >
                        {label}
                      </span>
                      <span className="truncate text-meta text-muted">
                        {t("slots.summary", {
                          role: t(`slots.role.${slot.role}`),
                          key: t(
                            `slots.keyKind.${empty ? "none" : (slot.keyKind ?? "custom")}`,
                          ),
                        })}
                      </span>
                    </span>
                    {sharingIndex === slot.index ? (
                      <MapPinIcon
                        aria-label={t("slots.sharesPosition")}
                        className="size-4 flex-none text-muted"
                      />
                    ) : null}
                    {dirtyChannels.includes(slot.index) ? (
                      <StatusDot status="dirty" label={t("slots.unsaved")} />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="m-0 px-1 text-meta text-muted">
            {overrideFrequency > 0
              ? `${t("header.frequency", { frequency: overrideFrequency })} · `
              : ""}
            {loraSlot > 0
              ? t("header.slot", { slot: loraSlot })
              : t("header.slotAuto")}
          </p>
          <ChannelLegend
            supportsSecondaryChannelLocation={supportsSecondaryChannelLocation}
          />
        </div>
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
          <ChannelShareCard
            index={selected}
            name={selectedName}
            settings={
              slotRole(radioChannel) === "disabled"
                ? undefined
                : radioChannel?.settings
            }
            loraConfig={config.lora}
            onMoreOptions={() => setDialogOpen("QR", true)}
            onImport={() => setDialogOpen("import", true)}
          />
        </div>
      </div>
      {editor ? (
        <ChannelEditor
          key={selected}
          index={selected}
          working={selectedChannel}
          device={radioChannel}
          editor={editor}
          defaultName={defaultName}
          metric={metric}
          onFormInit={onFormInit}
          onInvalidChange={setEditorInvalid}
        />
      ) : null}
      <ConfirmDialog
        open={pendingSlot !== undefined}
        onOpenChange={(open) => {
          if (!open) setPendingSlot(undefined);
        }}
        title={t("editor.discardTitle")}
        description={t("editor.discardDescription", { index: selected })}
        confirmLabel={t("editor.discardConfirm")}
        onConfirm={() => {
          if (pendingSlot !== undefined) setSelected(pendingSlot);
          setEditorInvalid(false);
          setPendingSlot(undefined);
        }}
      />
    </div>
  );
};
