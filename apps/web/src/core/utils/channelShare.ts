import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fromByteArray, toByteArray } from "base64-js";

const CHANNEL_SHARE_HOST = "meshtastic.org";
const CHANNEL_SHARE_PATH = "/e/";
const MAX_CHANNELS = 8;

export type ChannelShareMode = "replace" | "add";

export interface ParsedChannelShare {
  channelSet: Protobuf.AppOnly.ChannelSet;
  mode: ChannelShareMode;
  addOnly: boolean;
}

export interface ChannelImportAssignment {
  incomingIndex: number;
  targetIndex: number;
}

export interface ChannelImportPlan {
  mode: ChannelShareMode;
  addOnly: boolean;
  applyLora: boolean;
  assignments: ChannelImportAssignment[];
  availableSlots: number[];
  duplicateNames: string[];
  capacityShortfall: number;
  canApply: boolean;
}

export function encodeChannelShare({
  mode,
  settings,
  loraConfig,
}: {
  mode: ChannelShareMode;
  settings: readonly Protobuf.Channel.ChannelSettings[];
  loraConfig?: Protobuf.Config.Config_LoRaConfig;
}): string {
  if (settings.length === 0 || settings.length > MAX_CHANNELS) {
    throw new Error(
      "A channel share must include between one and eight channels.",
    );
  }

  const channelSet = create(Protobuf.AppOnly.ChannelSetSchema, {
    settings: [...settings],
    loraConfig: mode === "replace" ? loraConfig : undefined,
  });
  const payload = fromByteArray(
    toBinary(Protobuf.AppOnly.ChannelSetSchema, channelSet),
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `https://${CHANNEL_SHARE_HOST}${CHANNEL_SHARE_PATH}${
    mode === "add" ? "?add=true" : ""
  }#${payload}`;
}

export function parseChannelShare(input: string): ParsedChannelShare {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.hostname !== CHANNEL_SHARE_HOST ||
    url.pathname !== CHANNEL_SHARE_PATH ||
    url.username ||
    url.password ||
    !url.hash
  ) {
    throw new Error("Invalid Meshtastic channel URL.");
  }

  const queryMode = parseShareMode(url.searchParams);
  let payload = url.hash.substring(1);
  const legacyAdd = payload.endsWith("?add=true");
  if (legacyAdd) payload = payload.slice(0, -"?add=true".length);

  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    throw new Error("Invalid Meshtastic channel payload.");
  }

  const paddedPayload = payload
    .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const decoded = fromBinary(
    Protobuf.AppOnly.ChannelSetSchema,
    toByteArray(paddedPayload),
  );

  if (decoded.settings.length === 0 || decoded.settings.length > MAX_CHANNELS) {
    throw new Error("Channel share does not contain a valid channel set.");
  }

  const mode: ChannelShareMode =
    queryMode === "add" || legacyAdd ? "add" : "replace";
  return {
    mode,
    addOnly: mode === "add",
    // A malformed add-only payload can never carry LoRa settings into an Add import.
    channelSet:
      mode === "add"
        ? create(Protobuf.AppOnly.ChannelSetSchema, {
            settings: decoded.settings,
          })
        : decoded,
  };
}

export function createChannelImportPlan(
  share: ParsedChannelShare,
  existingChannels: readonly Protobuf.Channel.Channel[],
  requestedMode: ChannelShareMode,
  selectedSlots?: readonly number[],
): ChannelImportPlan {
  const mode = share.addOnly ? "add" : requestedMode;
  const channelsByIndex = new Map(
    existingChannels.map((channel) => [channel.index, channel]),
  );
  const availableSlots = Array.from(
    { length: MAX_CHANNELS - 1 },
    (_, index) => index + 1,
  ).filter((index) => {
    const channel = channelsByIndex.get(index);
    return (
      channel === undefined ||
      channel.role === Protobuf.Channel.Channel_Role.DISABLED ||
      channel.settings === undefined
    );
  });

  if (mode === "replace") {
    const assignments = share.channelSet.settings.map((_, incomingIndex) => ({
      incomingIndex,
      targetIndex: selectedSlots?.[incomingIndex] ?? incomingIndex,
    }));
    const duplicateTargets = new Set<number>();
    const seenTargets = new Set<number>();
    for (const assignment of assignments) {
      if (assignment.targetIndex < 0) continue;
      if (seenTargets.has(assignment.targetIndex)) {
        duplicateTargets.add(assignment.targetIndex);
      }
      seenTargets.add(assignment.targetIndex);
    }

    return {
      mode,
      addOnly: false,
      applyLora: share.channelSet.loraConfig !== undefined,
      assignments,
      availableSlots,
      duplicateNames: [],
      capacityShortfall: 0,
      canApply:
        duplicateTargets.size === 0 &&
        assignments.some((assignment) => assignment.targetIndex >= 0),
    };
  }

  const existingNames = new Set(
    existingChannels
      .map((channel) => channel.settings?.name.trim().toLocaleLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
  const incomingNames = new Set<string>();
  const duplicateNames = new Set<string>();
  for (const channel of share.channelSet.settings) {
    const name = channel.name.trim().toLocaleLowerCase();
    if (!name) continue;
    if (existingNames.has(name) || incomingNames.has(name))
      duplicateNames.add(name);
    incomingNames.add(name);
  }

  const assignments = share.channelSet.settings.map((_, incomingIndex) => ({
    incomingIndex,
    targetIndex:
      selectedSlots?.[incomingIndex] ?? availableSlots[incomingIndex] ?? -1,
  }));
  const invalidTarget = assignments.some(
    (assignment) =>
      assignment.targetIndex !== -1 &&
      !availableSlots.includes(assignment.targetIndex),
  );
  const selectedTargets = assignments
    .map((assignment) => assignment.targetIndex)
    .filter((targetIndex) => targetIndex >= 0);
  const hasDuplicateTargets =
    new Set(selectedTargets).size !== selectedTargets.length;
  const capacityShortfall = Math.max(
    0,
    share.channelSet.settings.length - availableSlots.length,
  );

  return {
    mode,
    addOnly: true,
    applyLora: false,
    assignments,
    availableSlots,
    duplicateNames: [...duplicateNames],
    capacityShortfall,
    canApply:
      duplicateNames.size === 0 &&
      capacityShortfall === 0 &&
      !invalidTarget &&
      !hasDuplicateTargets &&
      assignments.every((assignment) => assignment.targetIndex >= 0),
  };
}

function parseShareMode(search: URLSearchParams): ChannelShareMode {
  if (
    [...search.keys()].some((key) => key !== "add") ||
    search.getAll("add").length > 1
  ) {
    throw new Error("Invalid Meshtastic channel URL.");
  }
  const add = search.get("add");
  if (add !== null && add !== "true") {
    throw new Error("Invalid Meshtastic channel URL.");
  }
  return add === "true" ? "add" : "replace";
}
