import { useDevice } from "@core/stores";
import { getConfigEditor } from "../adapters/fromMeshDevice.ts";
import type { ConfigEditor } from "../features/config/index.ts";

/**
 * Returns the active connection's `ConfigEditor`, or `undefined` when nothing is
 * connected. The editor owns reactive signals — components bind to
 * `editor.radio`, `editor.dirtyModuleSections`, `editor.isDirty`, etc. via
 * `useSignal` to re-render on change. Mirrors `useConfigEditor` from
 * `@meshtastic/sdk-react` (PR #1050), sourced here from the legacy device
 * connection rather than a `MeshRegistry`.
 */
export function useConfigEditor(): ConfigEditor | undefined {
  const { connection } = useDevice();
  return connection ? getConfigEditor(connection) : undefined;
}
