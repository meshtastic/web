import type { MeshClient } from "@meshtastic/sdk";
import { useContext } from "react";
import { MeshContext } from "../provider/MeshContext.ts";
import { MeshRegistryContext } from "../provider/MeshRegistryContext.ts";
import { useSignal } from "./useSignal.ts";

/**
 * Returns the `MeshClient` for the current tree. Resolves in this order:
 *   1. The nearest `<MeshProvider client={...}>`.
 *   2. The active client of the nearest `<MeshRegistryProvider registry={...}>`.
 *
 * Throws if neither is present or the registry has no active client.
 */
export function useClient(): MeshClient {
  const direct = useContext(MeshContext);
  const registry = useContext(MeshRegistryContext);
  const active = useSignal(
    registry?.active ?? { value: undefined, peek: () => undefined, subscribe: () => () => {} },
  );
  const client = direct ?? active;
  if (!client) {
    throw new Error(
      "useClient must be called inside a <MeshProvider> or a <MeshRegistryProvider> with an active client.",
    );
  }
  return client;
}
