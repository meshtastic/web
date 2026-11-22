/** Minimal translate function; i18next's `t` satisfies it. */
export type ChannelLabelTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface ChannelLabelSource {
  readonly index: number;
  readonly name?: string;
}

/** A channel's name, else "Primary" for slot 0 and "Ch N" for the others. */
export const channelLabel = (
  channel: ChannelLabelSource,
  t: ChannelLabelTranslate,
): string => {
  const name = channel.name?.trim();
  if (name) {
    return name;
  }
  return channel.index === 0
    ? t("page.broadcastLabel", { ns: "channels" })
    : t("page.channelIndex", { ns: "channels", index: channel.index });
};
