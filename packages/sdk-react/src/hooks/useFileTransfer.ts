import type { FileTransfer } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export function useFileTransfer(): ReadonlyArray<FileTransfer> {
  const client = useClient();
  return useSignal(client.files.transfers);
}
