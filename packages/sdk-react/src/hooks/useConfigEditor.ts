import type { ConfigEditor } from "@meshtastic/sdk";
import { useActiveClient } from "../adapters/useActiveClient.ts";

/**
 * Returns the active client's `ConfigEditor`, or `undefined` when no client
 * is active. The editor itself owns reactive signals — components bind to
 * `editor.radio.value`, `editor.dirtyRadioSections.value`, etc. via
 * `useSignal` (or the existing `useSignalValue`/`useSyncExternalStore`
 * helpers) to re-render on change.
 */
export function useConfigEditor(): ConfigEditor | undefined {
  const client = useActiveClient();
  return client?.config.editor;
}
