import { Protobuf } from "@core/protobuf.ts";
import {
  distanceMeters,
  hasPos,
  type LngLat,
  toLngLat,
} from "@core/utils/geo.ts";
import {
  formatNodeId,
  initialsFor,
  nodeDisplayName,
} from "@core/utils/nodeIdentity.ts";
import {
  type LoRaSignalSettings,
  type SignalQuality,
  snrQuality,
} from "@core/utils/signalQuality.ts";

/**
 * A node as the Nodes table, node details panel and map list show it.
 * Pure: everything time- or locale-dependent comes in through the context.
 */

/** A node counts as online when it was heard within this window. */
export const ONLINE_WINDOW_MS = 2 * 60 * 60 * 1000;

/** `batteryLevel` firmware reports when the node runs on external power. */
export const BATTERY_PLUGGED_IN = 101;

export type BatteryInfo =
  | { readonly kind: "pluggedIn" }
  | { readonly kind: "level"; readonly percent: number };

/** The proto fields the row reads; `NodeInfoWithStatus` satisfies it. */
export interface NodeSource {
  readonly num: number;
  readonly user?: Protobuf.Mesh.User;
  readonly position?: Protobuf.Mesh.Position;
  readonly deviceMetrics?: Protobuf.Telemetry.DeviceMetrics;
  readonly snr: number;
  readonly lastHeard: number;
  readonly viaMqtt: boolean;
  readonly hopsAway?: number;
  readonly isFavorite: boolean;
  readonly isIgnored: boolean;
  readonly isMuted: boolean;
  readonly isKeyManuallyVerified: boolean;
  readonly hasXeddsaSigned: boolean;
  readonly heardOnCurrentLora: boolean;
  readonly status?: string;
}

export interface NodeRowContext {
  /** Epoch milliseconds. */
  readonly now: number;
  readonly myNodeNum?: number;
  /** Position of the connected device, for distances. */
  readonly myPosition?: Protobuf.Mesh.Position;
  readonly lora?: LoRaSignalSettings;
  /** Localised name for a node without one, from its id suffix. */
  readonly fallbackName: (idSuffix: string) => string;
}

export interface NodeRow {
  readonly num: number;
  /** `!xxxxxxxx`. */
  readonly id: string;
  readonly name: string;
  readonly shortName?: string;
  readonly initials: string;
  /** Role enum name with spaces, e.g. "CLIENT MUTE"; undefined without user info. */
  readonly role?: string;
  /** Hardware model enum name with spaces; undefined when unset. */
  readonly hardware?: string;
  /** Undefined when unknown, and for the connected radio. */
  readonly hops?: number;
  readonly viaMqtt: boolean;
  /** Heard directly over LoRa (zero hops, not via MQTT). */
  readonly isDirect: boolean;
  /**
   * Undefined when the node was never heard (the adapter reports 0 then),
   * and for the connected radio, which doesn't hear itself.
   */
  readonly snr?: number;
  readonly snrQuality?: SignalQuality;
  /** Epoch milliseconds; undefined when never heard. */
  readonly lastHeardMs?: number;
  readonly isOnline: boolean;
  readonly battery?: BatteryInfo;
  readonly voltage?: number;
  readonly channelUtilization?: number;
  readonly airUtilTx?: number;
  readonly uptimeSeconds?: number;
  readonly lngLat?: LngLat;
  readonly altitude?: number;
  readonly precisionBits?: number;
  readonly distanceMeters?: number;
  readonly macAddress?: string;
  readonly publicKey?: Uint8Array;
  readonly isFavorite: boolean;
  readonly isIgnored: boolean;
  readonly isMuted: boolean;
  readonly isKeyManuallyVerified: boolean;
  readonly hasXeddsaSigned: boolean;
  readonly isSelf: boolean;
  /** The node accepts direct messages. */
  readonly isMessageable: boolean;
  readonly unheardOnCurrentLora: boolean;
  readonly status?: string;
}

const enumLabel = (name: string | undefined): string | undefined =>
  name === undefined ? undefined : name.replaceAll("_", " ");

const nonEmpty = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/** `aa:bb:cc:dd:ee:ff`; undefined for an empty or all-zero address. */
export const formatMacAddress = (
  bytes: Uint8Array | undefined,
): string | undefined => {
  if (!bytes || bytes.length === 0 || bytes.every((b) => b === 0)) {
    return undefined;
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(":");
};

export const batteryInfo = (
  level: number | undefined,
): BatteryInfo | undefined => {
  if (level === undefined || level <= 0) {
    return undefined;
  }
  return level >= BATTERY_PLUGGED_IN
    ? { kind: "pluggedIn" }
    : { kind: "level", percent: Math.round(level) };
};

/** Last heard within `windowMs` of `now` (future skew counts as heard). */
export const isHeardWithin = (
  lastHeardMs: number | undefined,
  now: number,
  windowMs: number,
): boolean => lastHeardMs !== undefined && now - lastHeardMs <= windowMs;

const definedNumber = (value: number | undefined): number | undefined =>
  value === undefined || Number.isNaN(value) ? undefined : value;

export function toNodeRow(node: NodeSource, ctx: NodeRowContext): NodeRow {
  const user = node.user;
  const names = { longName: user?.longName, shortName: user?.shortName };
  const lastHeardMs = node.lastHeard > 0 ? node.lastHeard * 1000 : undefined;
  const heard = lastHeardMs !== undefined;
  const isSelf = ctx.myNodeNum !== undefined && node.num === ctx.myNodeNum;
  // The radio doesn't hear itself: its stored SNR is a placeholder 0.
  const snr = heard && !isSelf ? node.snr : undefined;
  const lngLat = hasPos(node.position) ? toLngLat(node.position) : undefined;
  const myLngLat =
    ctx.myPosition && hasPos(ctx.myPosition)
      ? toLngLat(ctx.myPosition)
      : undefined;
  const hardwareName =
    user && user.hwModel !== Protobuf.Mesh.HardwareModel.UNSET
      ? Protobuf.Mesh.HardwareModel[user.hwModel]
      : undefined;
  const metrics = node.deviceMetrics;
  const publicKey =
    user?.publicKey && user.publicKey.length > 0 ? user.publicKey : undefined;

  return {
    num: node.num,
    id: formatNodeId(node.num),
    name: nodeDisplayName(names, node.num, ctx.fallbackName),
    shortName: nonEmpty(user?.shortName),
    initials: initialsFor(names, node.num),
    role: user
      ? enumLabel(Protobuf.Config.Config_DeviceConfig_Role[user.role])
      : undefined,
    hardware: enumLabel(hardwareName),
    hops: isSelf ? undefined : definedNumber(node.hopsAway),
    viaMqtt: node.viaMqtt,
    isDirect: !isSelf && node.hopsAway === 0 && !node.viaMqtt,
    snr,
    snrQuality: snr === undefined ? undefined : snrQuality(snr, ctx.lora),
    lastHeardMs,
    isOnline: isHeardWithin(lastHeardMs, ctx.now, ONLINE_WINDOW_MS),
    battery: batteryInfo(metrics?.batteryLevel),
    voltage:
      metrics?.voltage !== undefined && metrics.voltage !== 0
        ? Math.abs(metrics.voltage)
        : undefined,
    channelUtilization: metrics?.channelUtilization,
    airUtilTx: metrics?.airUtilTx,
    uptimeSeconds: metrics?.uptimeSeconds || undefined,
    lngLat,
    altitude: node.position?.altitude,
    precisionBits: node.position?.precisionBits || undefined,
    distanceMeters:
      lngLat && myLngLat && !isSelf
        ? distanceMeters(myLngLat, lngLat)
        : undefined,
    macAddress: formatMacAddress(user?.macaddr),
    publicKey,
    isFavorite: node.isFavorite,
    isIgnored: node.isIgnored,
    isMuted: node.isMuted,
    isKeyManuallyVerified: node.isKeyManuallyVerified,
    hasXeddsaSigned: node.hasXeddsaSigned,
    isSelf,
    isMessageable: !isSelf && user?.isUnmessagable !== true,
    // MQTT-only nodes don't depend on LoRa settings.
    unheardOnCurrentLora: !node.heardOnCurrentLora && !node.viaMqtt,
    status: nonEmpty(node.status),
  };
}

/** How far away a node is, before it's put into words. */
export type HopsDisplay =
  /** The connected radio itself. */
  | { readonly kind: "self" }
  | { readonly kind: "direct"; readonly viaMqtt: boolean }
  | { readonly kind: "hops"; readonly count: number; readonly viaMqtt: boolean }
  | { readonly kind: "unknown"; readonly viaMqtt: boolean };

export const hopsDisplay = (
  row: Pick<NodeRow, "isSelf" | "isDirect" | "hops" | "viaMqtt">,
): HopsDisplay => {
  if (row.isSelf) {
    return { kind: "self" };
  }
  const { viaMqtt } = row;
  if (row.isDirect) {
    return { kind: "direct", viaMqtt };
  }
  return row.hops === undefined
    ? { kind: "unknown", viaMqtt }
    : { kind: "hops", count: row.hops, viaMqtt };
};

/**
 * Nodes other than the connected radio: the "known" count on the Nodes
 * screen and in channel headers.
 */
export const knownNodeCount = (rows: readonly NodeRow[]): number =>
  rows.reduce((count, row) => (row.isSelf ? count : count + 1), 0);

export interface NodeSummary {
  readonly known: number;
  readonly heardRecently: number;
}

/** "243 known · 38 heard in the last 2 h". Excludes the connected device. */
export const summarizeNodes = (rows: readonly NodeRow[]): NodeSummary => {
  const others = rows.filter((row) => !row.isSelf);
  return {
    known: knownNodeCount(rows),
    heardRecently: others.filter((row) => row.isOnline).length,
  };
};
