import { Channel } from "./Channel";
import { useMyNode } from "@shared/hooks";
import { type Channel as DbChannel, useChannels } from "@data/index";
import { Button } from "@shared/components/ui/button";
import { useDevice } from "@state/index.ts";
import i18next from "i18next";
import { ChevronRight, Plus, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_SECONDARY_CHANNELS = 7; // Channels 1-7 (channel 0 is always primary)

export const getChannelName = (channel: DbChannel) => {
  return channel.name?.length
    ? channel.name
    : channel.channelIndex === 0
      ? i18next.t("page.broadcastLabel", { ns: "channels" })
      : i18next.t("page.channelIndex", {
          ns: "channels",
          index: channel.channelIndex,
        });
};

const getRoleLabel = (role: number, channelIndex: number, t: (key: string) => string) => {
  if (channelIndex === 0) return t("role.options.primary");
  switch (role) {
    case 0:
      return t("role.options.disabled");
    case 1:
      return t("role.options.primary");
    case 2:
      return t("role.options.secondary");
    default:
      return t("role.options.disabled");
  }
};

export const Channels = () => {
  const device = useDevice();
  const { hasChannelChange } = device;
  const { myNodeNum } = useMyNode();
  const { channels } = useChannels(myNodeNum);
  const { t } = useTranslation("channels");
  const [openChannels, setOpenChannels] = useState<Set<number>>(new Set([0]));

  const allChannels = channels;

  const flags = useMemo(
    () =>
      new Map(
        allChannels.map((channel) => [
          channel.channelIndex,
          hasChannelChange(channel.channelIndex),
        ]),
      ),
    [allChannels, hasChannelChange],
  );

  // Enabled channels (role > 0) - these are shown in the list
  const enabledChannels = useMemo(
    () => allChannels.filter((ch) => ch.role > 0),
    [allChannels],
  );

  // Disabled channels that can be added
  const disabledChannels = useMemo(
    () => allChannels.filter((ch) => ch.role === 0 && ch.channelIndex > 0),
    [allChannels],
  );

  // Check if we can add more secondary channels
  const canAddChannel = disabledChannels.length > 0 &&
    enabledChannels.filter(ch => ch.channelIndex > 0).length < MAX_SECONDARY_CHANNELS;

  // Get the next disabled channel to show when "Add" is clicked
  const nextDisabledChannel = disabledChannels[0];

  const handleToggle = (channelIndex: number, isOpen: boolean) => {
    setOpenChannels(prev => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(channelIndex);
      } else {
        next.delete(channelIndex);
      }
      return next;
    });
  };

  const handleAddChannel = () => {
    if (nextDisabledChannel) {
      setOpenChannels(prev => new Set(prev).add(nextDisabledChannel.channelIndex));
    }
  };

  // Channels to display: enabled ones + one disabled one if user clicked "Add"
  const displayChannels = useMemo(() => {
    const result = [...enabledChannels];

    // If a disabled channel is open, include it in the list
    for (const ch of disabledChannels) {
      if (openChannels.has(ch.channelIndex)) {
        result.push(ch);
      }
    }

    // Sort by channel index
    return result.sort((a, b) => a.channelIndex - b.channelIndex);
  }, [enabledChannels, disabledChannels, openChannels]);

  return (
    <div className="space-y-2">
      {displayChannels.map((channel) => {
        const hasChanges = flags.get(channel.channelIndex);
        const isEnabled = channel.role > 0;
        const roleLabel = getRoleLabel(channel.role, channel.channelIndex, t);
        const isOpen = openChannels.has(channel.channelIndex);

        return (
          <details
            key={channel.channelIndex}
            id={`channel-details-${channel.channelIndex}`}
            className="group rounded-lg border bg-card"
            open={isOpen}
            onToggle={(e) => handleToggle(channel.channelIndex, e.currentTarget.open)}
          >
            <summary className="flex cursor-pointer items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />

              <Radio
                className={`size-4 shrink-0 ${
                  isEnabled
                    ? "text-green-500"
                    : "text-muted-foreground"
                }`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {getChannelName(channel)}
                  </span>
                  {hasChanges && (
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-2 animate-ping rounded-full bg-sky-500 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
                    </span>
                  )}
                </div>
                <span className={`text-sm ${
                  isEnabled
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50 italic"
                }`}>
                  {roleLabel}
                </span>
              </div>
            </summary>

            <div className="border-t px-4 py-4">
              <Channel channel={channel} />
            </div>
          </details>
        );
      })}

      {canAddChannel && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={handleAddChannel}
        >
          <Plus className="mr-2 size-4" />
          {t("page.addChannel", "Add Channel")}
        </Button>
      )}
    </div>
  );
};
