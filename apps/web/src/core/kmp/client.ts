import type { MeshtasticClient } from "@meshtastic/sdk-kmp";

export type { ConnectionStateJs, MeshtasticClient } from "@meshtastic/sdk-kmp";

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
): Promise<MeshtasticClient> {
  const kmp = await loadKmp();
  return kmp.createHttpClient(url, allowPrompt, MAX_RECONNECT_ATTEMPTS);
}
