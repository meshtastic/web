/**
 * Opt-in for connecting over HTTP through the Kotlin SDK while the
 * migration lands: `localStorage.setItem("meshtastic:web:kmp", "1")`.
 */
export const KMP_FLAG_KEY = "meshtastic:web:kmp";

export function isKmpEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(KMP_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}
