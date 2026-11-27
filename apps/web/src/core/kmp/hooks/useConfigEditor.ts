import type { ConfigEditor } from "@core/kmp/configEditor.ts";
import { editorFor } from "@core/kmp/configEditorIo.ts";
import { useRemoteSettings } from "@core/settings/remoteContext.ts";
import { useActiveClient } from "./registry.tsx";

/**
 * The active connection's `ConfigEditor`, or `undefined` when none is
 * active; inside remote settings, the managed node's. Components bind to
 * its signals with `useSignal`.
 */
export function useConfigEditor(): ConfigEditor | undefined {
  const client = useActiveClient();
  const remote = useRemoteSettings();
  if (remote) return remote.remote.editor;
  return client ? editorFor(client) : undefined;
}
