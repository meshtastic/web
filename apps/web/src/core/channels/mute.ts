import type { Protobuf } from "@core/protobuf.ts";

/** Anything carrying a channel's settings: protobuf, KMP or editor channel. */
export interface MutableChannel {
  readonly settings?: Pick<Protobuf.Channel.ChannelSettings, "moduleSettings">;
}

/**
 * Whether the user muted this channel (`ModuleSettings.is_muted`). The
 * radio stores the flag; clients that honour it skip notifications and
 * unread emphasis for the channel.
 */
export function isChannelMuted(channel: MutableChannel | undefined): boolean {
  return channel?.settings?.moduleSettings?.isMuted ?? false;
}
