import type {
  Connection,
  ConnectionStatus,
  ConnectionType,
} from "@core/stores/deviceStore/types.ts";
import {
  initialsFor,
  type NodeNames,
  nodeDisplayName,
  nodeIdSuffix,
} from "@core/utils/nodeIdentity.ts";

/**
 * What the shell shows about the connected radio (rail avatar, device card,
 * device menu), derived from data the client already holds. Pure.
 */

export type PowerState =
  | { readonly kind: "pluggedIn" }
  | { readonly kind: "battery"; readonly level: number };

export interface FirmwareVersion {
  /** Release, e.g. `2.8.1`. */
  readonly version: string;
  /** Build hash, e.g. `8e6a88d`, when the version string carries one. */
  readonly build?: string;
}

/** Connection state of the active radio, as the shell shows it. */
export type DeviceConnectionState =
  | "connected"
  | "connecting"
  | "configuring"
  | "error"
  | "offline";

/** Presence dot per state: green, amber while in progress, red on error. */
export const presenceForState = {
  connected: "online",
  connecting: "connecting",
  configuring: "connecting",
  error: "error",
  offline: "offline",
} as const satisfies Record<
  DeviceConnectionState,
  "online" | "connecting" | "error" | "offline"
>;

export interface DeviceSummary {
  readonly name: string;
  readonly initials: string;
  readonly state: DeviceConnectionState;
  /** `state === "connected"`. */
  readonly connected: boolean;
  readonly transport?: ConnectionType;
  /** Port, Bluetooth name or host. */
  readonly target?: string;
  readonly power?: PowerState;
  /** Formatted number without unit, e.g. `4.35`. */
  readonly voltage?: string;
  readonly firmware?: FirmwareVersion;
  /** Formatted percentage without the sign, e.g. `12.3`. */
  readonly channelUtilization?: string;
  readonly airUtilTx?: string;
}

export interface DeviceMetricsInput {
  readonly batteryLevel?: number | null;
  readonly voltage?: number | null;
  readonly channelUtilization?: number | null;
  readonly airUtilTx?: number | null;
}

export interface DeviceSummaryInput {
  readonly myNode?: {
    readonly num: number;
    readonly user?: NodeNames;
    readonly deviceMetrics?: DeviceMetricsInput;
  };
  readonly firmwareVersion?: string;
  readonly connection?: Connection;
  /** Localised "Meshtastic 5A97" style fallback from the node id suffix. */
  readonly fallbackName: (idSuffix: string) => string;
  /** Name when neither the node nor a connection is known yet. */
  readonly unknownName: string;
}

const stateForStatus = {
  connected: "connected",
  configured: "connected",
  online: "connected",
  connecting: "connecting",
  configuring: "configuring",
  disconnecting: "offline",
  disconnected: "offline",
  error: "error",
} as const satisfies Record<ConnectionStatus, DeviceConnectionState>;

/** Connecting or configuring: show a progress indication. */
export const isInProgress = (state: DeviceConnectionState): boolean =>
  state === "connecting" || state === "configuring";

/** A pending reconnect attempt reads as connecting, whatever the status. */
export const deviceConnectionState = (
  connection: Pick<Connection, "status" | "reconnect"> | undefined,
): DeviceConnectionState => {
  if (!connection) {
    return "offline";
  }
  if (connection.reconnect) {
    return "connecting";
  }
  return stateForStatus[connection.status];
};

export const isConnectedStatus = (status?: ConnectionStatus): boolean =>
  status !== undefined && stateForStatus[status] === "connected";

const finite = (value: number | null | undefined): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** Battery levels above 100 mean external power. */
export const powerState = (
  batteryLevel: number | null | undefined,
): PowerState | undefined => {
  const level = finite(batteryLevel);
  if (level === undefined || level < 0) {
    return undefined;
  }
  return level > 100
    ? { kind: "pluggedIn" }
    : { kind: "battery", level: Math.round(level) };
};

/** Three significant digits; zero means the radio has no voltage sense. */
export const formatVoltage = (
  voltage: number | null | undefined,
): string | undefined => {
  const value = finite(voltage);
  if (value === undefined || value === 0) {
    return undefined;
  }
  return Math.abs(value).toPrecision(3);
};

/** One decimal place, without a trailing `.0`. */
export const formatPercent = (
  value: number | null | undefined,
): string | undefined => {
  const n = finite(value);
  if (n === undefined || n < 0) {
    return undefined;
  }
  return String(Math.round(n * 10) / 10);
};

const FIRMWARE_PATTERN = /^v?(\d+\.\d+\.\d+)(?:\.([0-9a-f]+))?/i;

/** `2.8.1.8e6a88d` → `{ version: "2.8.1", build: "8e6a88d" }`. */
export const parseFirmwareVersion = (
  raw: string | undefined,
): FirmwareVersion | undefined => {
  const text = (raw ?? "").trim();
  if (!text) {
    return undefined;
  }
  const match = FIRMWARE_PATTERN.exec(text);
  const version = match?.[1];
  if (!version) {
    return { version: text };
  }
  const build = match[2];
  return build ? { version, build } : { version };
};

const hex4 = (value: number): string => value.toString(16).padStart(4, "0");

const hostOf = (url: string): string => {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
};

/** What the connection points at: `303a:1001`, a BLE name, or a host. */
export const connectionTarget = (
  connection: Connection,
): string | undefined => {
  switch (connection.type) {
    case "serial":
      return connection.usbVendorId !== undefined &&
        connection.usbProductId !== undefined
        ? `${hex4(connection.usbVendorId)}:${hex4(connection.usbProductId)}`
        : undefined;
    case "bluetooth":
      return connection.deviceName || undefined;
    case "http":
      return connection.url ? hostOf(connection.url) : undefined;
  }
};

export const deriveDeviceSummary = ({
  myNode,
  firmwareVersion,
  connection,
  fallbackName,
  unknownName,
}: DeviceSummaryInput): DeviceSummary => {
  const names: NodeNames = myNode?.user ?? {};
  const name = myNode
    ? nodeDisplayName(names, myNode.num, fallbackName)
    : connection?.name || unknownName;
  const initials = myNode
    ? initialsFor(names, myNode.num)
    : Array.from(name).slice(0, 4).join("");
  const metrics = myNode?.deviceMetrics;
  const state = deviceConnectionState(connection);
  return {
    name,
    initials,
    state,
    connected: state === "connected",
    transport: connection?.type,
    target: connection ? connectionTarget(connection) : undefined,
    power: powerState(metrics?.batteryLevel),
    voltage: formatVoltage(metrics?.voltage),
    firmware: parseFirmwareVersion(firmwareVersion),
    channelUtilization: formatPercent(metrics?.channelUtilization),
    airUtilTx: formatPercent(metrics?.airUtilTx),
  };
};

/**
 * One fact in the device card's subtitle ("Serial · 4.35 V · fw 2.8.1"),
 * led by the connection state whenever it is not simply connected.
 */
export type DeviceCardFact =
  | {
      readonly kind: "state";
      readonly state: Exclude<DeviceConnectionState, "connected">;
    }
  | { readonly kind: "transport"; readonly transport: ConnectionType }
  | { readonly kind: "voltage"; readonly value: string }
  | { readonly kind: "firmware"; readonly version: string };

export const deviceCardFacts = (
  summary: DeviceSummary,
): readonly DeviceCardFact[] => {
  const facts: DeviceCardFact[] = [];
  if (summary.state !== "connected") {
    facts.push({ kind: "state", state: summary.state });
  }
  if (summary.transport) {
    facts.push({ kind: "transport", transport: summary.transport });
  }
  if (summary.voltage) {
    facts.push({ kind: "voltage", value: summary.voltage });
  }
  if (summary.firmware) {
    facts.push({ kind: "firmware", version: summary.firmware.version });
  }
  return facts;
};

export type DeviceMenuActionId =
  | "deviceSettings"
  | "manageConnections"
  | "reboot"
  | "disconnect";

export interface DeviceMenuAction {
  readonly id: DeviceMenuActionId;
  readonly tone: "default" | "danger";
}

/** Menu actions in order. Reboot and disconnect need a live connection. */
export const deviceMenuActions = (
  connected: boolean,
): readonly DeviceMenuAction[] => [
  { id: "deviceSettings", tone: "default" },
  { id: "manageConnections", tone: "default" },
  ...(connected
    ? [
        { id: "reboot", tone: "default" } as const,
        { id: "disconnect", tone: "danger" } as const,
      ]
    : []),
];

export interface DeviceListEntry {
  readonly id: number;
  readonly name: string;
  readonly initials: string;
  readonly active: boolean;
}

export interface DeviceListInput {
  readonly id: number;
  /** Node number, once the radio has reported it. */
  readonly myNodeNum?: number;
  /** Name of the saved connection this device was last reached through. */
  readonly connectionName?: string;
}

/**
 * Known radios for the device menu's "Devices" list. Each is named by its
 * owner name when a node DB has it, else by its own saved connection, else
 * by the node id fallback.
 */
export const deviceListEntries = (
  devices: readonly DeviceListInput[],
  activeId: number,
  namesFor: (nodeNum: number) => NodeNames | undefined,
  fallbackName: (idSuffix: string) => string,
): readonly DeviceListEntry[] =>
  devices.flatMap((device) => {
    const nodeNum = device.myNodeNum ?? 0;
    const connectionName = (device.connectionName ?? "").trim();
    if (nodeNum === 0 && !connectionName) {
      return [];
    }
    const names = nodeNum === 0 ? undefined : namesFor(nodeNum);
    const ownerName =
      (names?.longName ?? "").trim() || (names?.shortName ?? "").trim();
    const name =
      ownerName || connectionName || fallbackName(nodeIdSuffix(nodeNum));
    return [
      {
        id: device.id,
        name,
        initials:
          names || !connectionName
            ? initialsFor(names ?? {}, nodeNum)
            : Array.from(connectionName).slice(0, 4).join(""),
        active: device.id === activeId,
      },
    ];
  });
