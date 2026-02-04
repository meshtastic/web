import { Channel } from "./Channel";
import { useMyNode } from "@shared/hooks";
import { type Channel as DbChannel, useChannels } from "@data/index";
import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Switch } from "@shared/components/ui/switch";
import i18next from "i18next";
import { ChevronRight, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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

const getRoleLabel = (
  role: number,
  channelIndex: number,
  t: (key: string) => string,
) => {
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
  const { myNodeNum } = useMyNode();
  const { channels } = useChannels(myNodeNum);
  const { pendingChanges, saveChange, clearChange } =
    usePendingChanges(myNodeNum);
  const { t } = useTranslation("channels");
  const [openChannels, setOpenChannels] = useState<Set<number>>(new Set([0]));

  const allChannels = channels;

  // Check if a channel has pending changes in the database
  const hasChannelChange = useCallback(
    (channelIndex: number) =>
      pendingChanges.some(
        (c) => c.changeType === "channel" && c.channelIndex === channelIndex,
      ),
    [pendingChanges],
  );

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

  // Disabled channels not yet opened — shown as "Add Channel" placeholders
  const placeholderChannels = useMemo(
    () => disabledChannels.filter((ch) => !openChannels.has(ch.channelIndex)),
    [disabledChannels, openChannels],
  );

  const handleToggle = (channelIndex: number, isOpen: boolean) => {
    setOpenChannels((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(channelIndex);
      } else {
        next.delete(channelIndex);
      }
      return next;
    });
  };

  const handleAddChannel = (channelIndex: number) => {
    setOpenChannels((prev) => new Set(prev).add(channelIndex));
  };

  const handleToggleEnabled = useCallback(
    (channel: DbChannel, enabled: boolean) => {
      const newRole = enabled ? 2 : 0; // 2 = SECONDARY, 0 = DISABLED
      const updated = { ...channel, role: newRole, updatedAt: new Date() };
      if (JSON.stringify(updated) === JSON.stringify(channel)) {
        clearChange({
          changeType: "channel",
          channelIndex: channel.channelIndex,
        });
      } else {
        saveChange({
          changeType: "channel",
          channelIndex: channel.channelIndex,
          value: updated,
          originalValue: channel,
        });
      }
    },
    [saveChange, clearChange],
  );

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {displayChannels.map((channel) => {
        const hasChanges = flags.get(channel.channelIndex);
        const roleLabel = getRoleLabel(channel.role, channel.channelIndex, t);
        const isOpen = openChannels.has(channel.channelIndex);

        return (
          <Card
            key={channel.channelIndex}
            className={isOpen ? "md:col-span-2" : ""}
          >
            <CardHeader
              className="p-3 cursor-pointer"
              onClick={() => handleToggle(channel.channelIndex, !isOpen)}
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">
                    {getChannelName(channel)}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {roleLabel}
                  </span>
                </div>
                {hasChanges && (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-2 animate-ping rounded-full bg-sky-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
                  </span>
                )}
                <Switch
                  checked={channel.role > 0}
                  disabled={channel.channelIndex === 0}
                  onCheckedChange={(checked) =>
                    handleToggleEnabled(channel, checked)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent>
                <Channel channel={channel} />
              </CardContent>
            )}
          </Card>
        );
      })}

      {placeholderChannels.map((ch) => (
        <Card
          key={`add-${ch.channelIndex}`}
          className="md:col-span-2 border-dashed cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => handleAddChannel(ch.channelIndex)}
        >
          <CardHeader className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plus className="size-3.5 shrink-0" />
              <CardTitle className="text-sm font-medium">
                {t("page.addChannel", "Add Channel")}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};
