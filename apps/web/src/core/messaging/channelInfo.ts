/**
 * What the channel header and details panel say about a channel: its
 * encryption (from the PSK length) and which nodes were heard on it.
 */

/**
 * - `none`: empty PSK, sent in the clear.
 * - `defaultKey`: a one-byte PSK selects one of the well-known keys
 *   (AES-128 everyone has), so it isn't private.
 * - `aes128` / `aes256`: a private 16 / 32 byte key.
 */
export type ChannelEncryption = "none" | "defaultKey" | "aes128" | "aes256";

export const channelEncryption = (
  psk: Uint8Array | undefined,
): ChannelEncryption => {
  const length = psk?.length ?? 0;
  if (length === 0) {
    return "none";
  }
  if (length === 1) {
    return "defaultKey";
  }
  return length >= 32 ? "aes256" : "aes128";
};

/** Only a private key keeps the channel's traffic private. */
export const isPrivatelyEncrypted = (encryption: ChannelEncryption): boolean =>
  encryption === "aes128" || encryption === "aes256";

/** Window the channel panel's "Recently heard" list covers. */
export const RECENTLY_HEARD_WINDOW_MS = 2 * 60 * 60 * 1000;

export interface HeardNode {
  readonly num: number;
  /** Epoch milliseconds. */
  readonly lastHeardMs?: number;
  /** Channel index the node was last heard on. */
  readonly channel?: number;
  readonly isSelf: boolean;
}

/**
 * Nodes last heard on `channel` within `windowMs` of `now`, most recent
 * first, without this radio itself.
 */
export const recentlyHeardOn = <T extends HeardNode>(
  nodes: readonly T[],
  channel: number,
  now: number,
  windowMs: number = RECENTLY_HEARD_WINDOW_MS,
): T[] =>
  nodes
    .filter(
      (node) =>
        !node.isSelf &&
        (node.channel ?? 0) === channel &&
        node.lastHeardMs !== undefined &&
        now - node.lastHeardMs <= windowMs,
    )
    .sort((a, b) => (b.lastHeardMs ?? 0) - (a.lastHeardMs ?? 0));

/**
 * Nodes heard most recently on every channel, for the Chats screen's
 * "Heard recently" shortcuts.
 */
export const recentlyHeard = <T extends HeardNode>(
  nodes: readonly T[],
  limit: number,
): T[] =>
  nodes
    .filter((node) => !node.isSelf && node.lastHeardMs !== undefined)
    .sort((a, b) => (b.lastHeardMs ?? 0) - (a.lastHeardMs ?? 0))
    .slice(0, Math.max(0, limit));
