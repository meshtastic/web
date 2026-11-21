import { firstFreeSecondarySlot } from "@core/utils/beaconJoin.ts";
import { channelSetFromUrl } from "@core/utils/channelUrl.ts";
import { Protobuf } from "@core/protobuf.ts";
import { Result } from "better-result";

type ChannelSettings = Protobuf.Channel.ChannelSettings;
type ChannelSet = Protobuf.AppOnly.ChannelSet;

const MAX_CHANNELS = 8;

export type ChannelImportMode = "add" | "replace";

export type ChannelLinkError = "empty" | "invalid" | "noChannels";

/** Parses a meshtastic.org/e/ channel link without throwing. */
export function parseChannelLink(
  input: string,
): Result<ChannelSet, ChannelLinkError> {
  const url = input.trim();
  if (url.length === 0) return Result.err("empty");
  try {
    const channelSet = channelSetFromUrl(url);
    if (channelSet.settings.length === 0) return Result.err("noChannels");
    return Result.ok(channelSet);
  } catch {
    return Result.err("invalid");
  }
}

export interface ChannelAssignment {
  /** Position of the channel in the link. */
  readonly from: number;
  /** Channel slot on the radio. */
  readonly slot: number;
  readonly role: "primary" | "secondary";
}

export interface ChannelImportPlan {
  readonly assignments: ReadonlyArray<ChannelAssignment>;
  /** Slots that hold a channel today and are cleared by a replace. */
  readonly disable: ReadonlyArray<number>;
  /** Link channels left out: no free slot, or already on the radio. */
  readonly skipped: number;
  /** A replace also applies the link's LoRa settings. */
  readonly applyLora: boolean;
}

const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);

const sameChannel = (a: ChannelSettings, b: ChannelSettings): boolean =>
  a.name === b.name && bytesEqual(a.psk, b.psk);

/**
 * Where each channel in a link goes. "add" fills free secondary slots in
 * order and leaves out channels the radio already has; "replace" puts the
 * link's channels in slots 0..n (the first becomes primary), clears the
 * other used slots and applies the link's LoRa settings.
 *
 * `current` is the radio's channel settings by slot, undefined for an
 * unused slot.
 */
export function planChannelImport(
  link: ChannelSet,
  current: ReadonlyArray<ChannelSettings | undefined>,
  mode: ChannelImportMode,
): ChannelImportPlan {
  const incoming = link.settings;
  if (mode === "replace") {
    const kept = incoming.slice(0, MAX_CHANNELS);
    const assignments = kept.map((_, i): ChannelAssignment => ({
      from: i,
      slot: i,
      role: i === 0 ? "primary" : "secondary",
    }));
    const disable: number[] = [];
    for (let slot = kept.length; slot < MAX_CHANNELS; slot++) {
      if (current[slot] !== undefined) disable.push(slot);
    }
    return {
      assignments,
      disable,
      skipped: incoming.length - kept.length,
      applyLora: link.loraConfig !== undefined,
    };
  }

  const slots: Array<ChannelSettings | undefined> = Array.from(
    { length: MAX_CHANNELS },
    (_, i) => current[i],
  );
  const assignments: ChannelAssignment[] = [];
  let skipped = 0;
  incoming.forEach((settings, from) => {
    const present = slots.some(
      (s) => s !== undefined && sameChannel(s, settings),
    );
    const slot = present ? undefined : firstFreeSecondarySlot(slots);
    if (slot === undefined) {
      skipped += 1;
      return;
    }
    slots[slot] = settings;
    assignments.push({ from, slot, role: "secondary" });
  });
  return { assignments, disable: [], skipped, applyLora: false };
}

/** The default public channel: unnamed (named by its preset) with the default key. */
export const isDefaultPublicChannel = (
  settings: ChannelSettings | undefined,
): boolean =>
  settings !== undefined &&
  settings.name === "" &&
  bytesEqual(settings.psk, new Uint8Array([1]));
