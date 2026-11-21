import {
  POSITION_PRECISION_MAX,
  POSITION_PRECISION_MIN,
  POSITION_PRECISION_OFF,
  POSITION_PRECISION_PRECISE,
} from "@app/validation/channel.ts";
import { create } from "@bufbuild/protobuf";
import { isChannelMuted } from "@core/channels/mute.ts";
import { Protobuf } from "@core/protobuf.ts";
import {
  DEFAULT_PSK,
  generatePsk,
  MAX_CHANNELS,
  pskByteLength,
} from "./channelStaging.ts";

const Role = Protobuf.Channel.Channel_Role;

type ChannelLike = Pick<Protobuf.Channel.Channel, "index" | "role"> & {
  settings?: Protobuf.Channel.ChannelSettings;
};

/** The Encryption choices, by key length. */
export const KEY_KINDS = ["default", "aes128", "aes256", "none"] as const;
export type KeyKind = (typeof KEY_KINDS)[number];

const KIND_BYTES: Record<KeyKind, number> = {
  none: 0,
  default: 1,
  aes128: 16,
  aes256: 32,
};

/** The Encryption choice a base64 key matches, or undefined if it's invalid. */
export function keyKindOf(psk: string): KeyKind | undefined {
  const bytes = pskByteLength(psk);
  return KEY_KINDS.find((kind) => KIND_BYTES[kind] === bytes);
}

/** A key for a new Encryption choice: fresh random bytes for AES. */
export function pskForKind(
  kind: KeyKind,
  random: (bytes: number) => string = generatePsk,
): string {
  switch (kind) {
    case "none":
      return "";
    case "default":
      return DEFAULT_PSK;
    case "aes128":
    case "aes256":
      return random(KIND_BYTES[kind]);
  }
}

/** "Generate new" keeps the key's length; short keys become AES-256. */
export function regeneratedPsk(
  psk: string,
  random: (bytes: number) => string = generatePsk,
): string {
  const kind = keyKindOf(psk);
  return random(kind === "aes128" ? 16 : 32);
}

export type SlotRole = "primary" | "secondary" | "disabled";

export interface SlotSummary {
  readonly index: number;
  readonly role: SlotRole;
  /** The channel's own name; undefined when unnamed. */
  readonly name: string | undefined;
  /** Undefined for disabled slots and keys of an unsupported length. */
  readonly keyKind: KeyKind | undefined;
}

/** Slot 0 is always the primary; other slots are secondary or disabled. */
export function slotRole(channel: ChannelLike | undefined): SlotRole {
  if (!channel || channel.role === Role.DISABLED) return "disabled";
  return channel.index === 0 ? "primary" : "secondary";
}

/** All eight slots, in order, whether or not the radio reported them. */
export function slotSummaries(
  channels: ReadonlyMap<number, ChannelLike>,
): SlotSummary[] {
  return Array.from({ length: MAX_CHANNELS }, (_, index) => {
    const channel = channels.get(index);
    const role = slotRole(channel);
    if (role === "disabled") {
      return { index, role, name: undefined, keyKind: undefined };
    }
    const name = channel?.settings?.name.trim();
    const psk = channel?.settings?.psk ?? new Uint8Array(0);
    return {
      index,
      role,
      name: name ? name : undefined,
      keyKind: KEY_KINDS.find((kind) => KIND_BYTES[kind] === psk.byteLength),
    };
  });
}

/** Share position choices: off, the ten approximate levels, precise. */
export const PRECISION_CHOICES: readonly number[] = [
  POSITION_PRECISION_OFF,
  ...Array.from(
    { length: POSITION_PRECISION_MAX - POSITION_PRECISION_MIN + 1 },
    (_, i) => POSITION_PRECISION_MIN + i,
  ),
  POSITION_PRECISION_PRECISE,
];

/**
 * The channel with its mute flag set. Unchanged when the flag already
 * matches, so an untouched channel stays equal to the radio's.
 */
export function withMuted(
  channel: Protobuf.Channel.Channel,
  muted: boolean,
): Protobuf.Channel.Channel {
  const settings = channel.settings;
  if (isChannelMuted(channel) === muted) return channel;
  const base = settings ?? create(Protobuf.Channel.ChannelSettingsSchema);
  return {
    ...channel,
    settings: {
      ...base,
      moduleSettings: {
        ...(base.moduleSettings ??
          create(Protobuf.Channel.ModuleSettingsSchema)),
        isMuted: muted,
      },
    },
  };
}
