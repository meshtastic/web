import type { MeshtasticClient, StorageJs } from "@meshtastic/sdk-kmp";

export type {
  ConnectionStateJs,
  MeshtasticClient,
  StorageJs,
} from "@meshtastic/sdk-kmp";

/** Reconnect attempts the SDK makes before giving up, as the user approved. */
export const MAX_RECONNECT_ATTEMPTS = 10;

type KmpModule = typeof import("@meshtastic/sdk-kmp");

let loading: Promise<KmpModule> | undefined;

/**
 * The Kotlin SDK is ~240 KB gzipped, so it is loaded on first connect
 * rather than with the app shell.
 */
export function loadKmp(): Promise<KmpModule> {
  loading ??= import("@meshtastic/sdk-kmp");
  return loading;
}

export async function createHttpClient(
  url: string,
  allowPrompt: boolean,
  storage?: StorageJs,
): Promise<MeshtasticClient> {
  const kmp = await loadKmp();
  return kmp.createHttpClient(
    url,
    allowPrompt,
    MAX_RECONNECT_ATTEMPTS,
    storage,
  );
}

export interface SerialTarget {
  /** A port picked inside a click handler; otherwise the SDK reopens by USB ids. */
  port?: SerialPort;
  usbVendorId?: number;
  usbProductId?: number;
}

export interface BluetoothTarget {
  /** A device picked inside a click handler; otherwise the SDK looks `deviceId` up. */
  device?: BluetoothDevice;
  deviceId?: string;
}

export async function createSerialClient(
  target: SerialTarget,
  storage?: StorageJs,
): Promise<MeshtasticClient> {
  const kmp = await loadKmp();
  return kmp.createSerialClient(
    target.port,
    target.usbVendorId,
    target.usbProductId,
    MAX_RECONNECT_ATTEMPTS,
    storage,
  );
}

export async function createBluetoothClient(
  target: BluetoothTarget,
  storage?: StorageJs,
): Promise<MeshtasticClient> {
  const kmp = await loadKmp();
  return kmp.createBluetoothClient(
    target.device,
    target.deviceId,
    MAX_RECONNECT_ATTEMPTS,
    storage,
  );
}
