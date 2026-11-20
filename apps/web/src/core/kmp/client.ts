import { createLogger } from "@core/log.ts";
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

const sdkLog = createLogger("sdk");

/** Routes the SDK's own log lines into the web logger, prefixed with their tag. */
function routeSdkLogs(kmp: KmpModule): KmpModule {
  kmp.setSdkLogger((level, tag, message, error) => {
    const args: unknown[] = error ? [{ error }] : [];
    const line = `${tag}: ${message}`;
    switch (level) {
      case "verbose":
        sdkLog.trace(line, ...args);
        return;
      case "debug":
        sdkLog.debug(line, ...args);
        return;
      case "warn":
        sdkLog.warn(line, ...args);
        return;
      case "error":
        sdkLog.error(line, ...args);
        return;
      default:
        sdkLog.info(line, ...args);
    }
  });
  return kmp;
}

/**
 * The Kotlin SDK is ~240 KB gzipped, so it is loaded on first connect
 * rather than with the app shell.
 */
export function loadKmp(): Promise<KmpModule> {
  loading ??= import("@meshtastic/sdk-kmp").then(routeSdkLogs);
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
