import {
  type ChannelIdentity,
  channelIdentity,
  DEFAULT_LORA,
  sameIdentity,
} from "@core/channels/channelIdentity.ts";
import { firstFreeSecondarySlot } from "@core/utils/beaconJoin.ts";
import { channelSetFromUrl } from "@core/utils/channelUrl.ts";
import { Protobuf } from "@core/protobuf.ts";
import { Result } from "better-result";

type ChannelSettings = Protobuf.Channel.ChannelSettings;
type ChannelSet = Protobuf.AppOnly.ChannelSet;
type LoRa = Protobuf.Config.Config_LoRaConfig;

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
  /** Selected link channels left out: no free slot, or already on the radio. */
  readonly skipped: number;
  /** Selected link positions left out of an add: the radio has them. */
  readonly alreadyOnRadio: ReadonlyArray<number>;
  /** Selected link positions left out of an add: an earlier link channel is the same. */
  readonly duplicates: ReadonlyArray<number>;
  /** Selected link positions left out for want of a free slot. */
  readonly noSlot: ReadonlyArray<number>;
  /**
   * Link positions an add puts on the radio next to a channel (on the
   * radio, or added before it from the link) with the same name and a
   * different key.
   */
  readonly nameConflicts: ReadonlyArray<number>;
  /** Secondary slots free before the import. */
  readonly freeSlots: number;
  /** A replace also applies the link's LoRa settings. */
  readonly applyLora: boolean;
}

/**
 * Only a link with LoRa settings can replace: an add link has none, so it
 * can only be added.
 */
export const canReplace = (link: ChannelSet): boolean =>
  link.loraConfig !== undefined;

/** Replace when the link can, add otherwise. */
export const defaultImportMode = (link: ChannelSet): ChannelImportMode =>
  canReplace(link) ? "replace" : "add";

const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);

const isFreeSlot = (s: ChannelSettings | undefined): boolean =>
  !s || (!s.name && s.psk.length === 0);

/**
 * Where each channel in a link goes. "add" fills free secondary slots in
 * order, leaves out channels the radio already has and never touches a
 * used slot or the LoRa settings; "replace" puts the link's channels in
 * slots 0..n (the first becomes primary), clears the other used slots and
 * applies the link's LoRa settings. A link without LoRa settings can't
 * replace (see `canReplace`), so it is always added.
 *
 * `current` is the radio's channel settings by slot, undefined for an
 * unused slot. `selected` lists the link positions to import, all of them
 * when left out. `lora` is the radio's LoRa section, which names unnamed
 * channels; the default (LongFast) when it isn't known.
 *
 * Add mirrors Android `getChannelPreviewForAdd`
 * (core/ui/.../util/ProtoExtensions.kt): channels match by effective name
 * and key (`ChannelSettings.channelIdentity`), a channel the radio or an
 * earlier link channel already has is left out, and a same-name channel
 * with another key is flagged. Unlike Android it never drops a channel the
 * radio has to make room.
 */
export function planChannelImport(
  link: ChannelSet,
  current: ReadonlyArray<ChannelSettings | undefined>,
  mode: ChannelImportMode,
  selected?: ReadonlyArray<number>,
  lora: LoRa = DEFAULT_LORA,
): ChannelImportPlan {
  const picked = link.settings
    .map((settings, from) => ({ settings, from }))
    .filter(({ from }) => selected === undefined || selected.includes(from));
  let freeSlots = 0;
  for (let slot = 1; slot < MAX_CHANNELS; slot++) {
    if (isFreeSlot(current[slot])) freeSlots += 1;
  }

  if (mode === "replace" && canReplace(link)) {
    const kept = picked.slice(0, MAX_CHANNELS);
    const assignments = kept.map(({ from }, i): ChannelAssignment => ({
      from,
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
      skipped: picked.length - kept.length,
      alreadyOnRadio: [],
      duplicates: [],
      noSlot: picked.slice(MAX_CHANNELS).map(({ from }) => from),
      nameConflicts: [],
      freeSlots,
      applyLora: kept.length > 0,
    };
  }

  const slots: Array<ChannelSettings | undefined> = Array.from(
    { length: MAX_CHANNELS },
    (_, i) => current[i],
  );
  // The primary always counts; a blank secondary is a free slot.
  const onRadio: ChannelIdentity[] = slots.flatMap((s, slot) =>
    s !== undefined && (slot === 0 || !isFreeSlot(s))
      ? [channelIdentity(s, lora)]
      : [],
  );
  const fromLink: ChannelIdentity[] = [];
  const assignments: ChannelAssignment[] = [];
  const nameConflicts: number[] = [];
  const alreadyOnRadio: number[] = [];
  const duplicates: number[] = [];
  const noSlot: number[] = [];
  for (const { settings, from } of picked) {
    const identity = channelIdentity(settings, lora);
    if (onRadio.some((c) => sameIdentity(c, identity))) {
      alreadyOnRadio.push(from);
      continue;
    }
    if (fromLink.some((c) => sameIdentity(c, identity))) {
      duplicates.push(from);
      continue;
    }
    const slot = firstFreeSecondarySlot(slots);
    if (slot === undefined) {
      noSlot.push(from);
      continue;
    }
    if ([...onRadio, ...fromLink].some((c) => c.name === identity.name)) {
      nameConflicts.push(from);
    }
    fromLink.push(identity);
    slots[slot] = settings;
    assignments.push({ from, slot, role: "secondary" });
  }
  return {
    assignments,
    disable: [],
    skipped: alreadyOnRadio.length + duplicates.length + noSlot.length,
    alreadyOnRadio,
    duplicates,
    noSlot,
    nameConflicts,
    freeSlots,
    applyLora: false,
  };
}

/** The default public channel: unnamed (named by its preset) with the default key. */
export const isDefaultPublicChannel = (
  settings: ChannelSettings | undefined,
): boolean =>
  settings !== undefined &&
  settings.name === "" &&
  bytesEqual(settings.psk, new Uint8Array([1]));
