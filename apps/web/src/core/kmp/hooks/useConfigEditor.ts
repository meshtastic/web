import type { ConfigEditor } from "@core/kmp/configEditor.ts";
import { editorFor } from "@core/kmp/configEditorIo.ts";
import { useActiveClient } from "./registry.tsx";

/**
 * The active connection's `ConfigEditor`, or `undefined` when none is
 * active. Components bind to its signals with `useSignal`.
 */
export function useConfigEditor(): ConfigEditor | undefined {
  const client = useActiveClient();
  return client ? editorFor(client) : undefined;
}
