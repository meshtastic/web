import type { ConnectionType } from "@core/stores/deviceStore/types.ts";
import type {
  DeviceConnectionState,
  DeviceMenuActionId,
} from "./deviceSummary.ts";
import type { NavDestination } from "./navItems.ts";

/**
 * Translation keys for shell labels, reusing existing (already translated)
 * keys where the copy matches.
 */

export interface LabelKey {
  readonly ns: "ui" | "common";
  readonly key: string;
}

/** Destination names, shared with the page titles. */
export const navLabelKeys = {
  messages: "navigation.messages",
  nodes: "navigation.nodes",
  map: "navigation.map",
  settings: "navigation.settings",
} as const satisfies Record<NavDestination, string>;

export const transportLabelKeys = {
  serial: "shell.transportSerial",
  bluetooth: "shell.transportBluetooth",
  http: "shell.transportHttp",
} as const satisfies Record<ConnectionType, string>;

export const deviceMenuActionLabels = {
  deviceSettings: { ns: "ui", key: "shell.deviceSettings" },
  manageConnections: { ns: "ui", key: "navigation.manageConnections" },
  reboot: { ns: "ui", key: "shell.reboot" },
  disconnect: { ns: "common", key: "button.disconnect" },
} as const satisfies Record<DeviceMenuActionId, LabelKey>;

export const stateLabelKeys = {
  connected: "shell.statusConnected",
  connecting: "shell.statusConnecting",
  configuring: "shell.statusConfiguring",
  error: "shell.statusError",
  offline: "shell.notConnected",
} as const satisfies Record<DeviceConnectionState, string>;
