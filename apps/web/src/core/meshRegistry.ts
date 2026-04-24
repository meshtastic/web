import { MeshRegistry } from "@meshtastic/sdk";

/**
 * App-wide MeshRegistry singleton.
 *
 * Holds one `MeshClient` per active connection. Wrapped at the root by
 * `<MeshRegistryProvider registry={meshRegistry}>` so descendant components
 * can use `useMeshDevice()`, `useChat()`, etc. against the active client.
 *
 * During Phase B migration the registry coexists with the legacy Zustand
 * deviceStore; `useConnections` continues to instantiate `MeshDevice` (the
 * SDK's Phase-A shim) until per-slice migrations land.
 */
export const meshRegistry = new MeshRegistry();
