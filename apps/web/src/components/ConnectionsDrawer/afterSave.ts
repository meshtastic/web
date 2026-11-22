import type { ConnectionStatus } from "@app/core/stores/deviceStore/types.ts";

/**
 * Whether the drawer closes after a connection is saved. It closes while the
 * radio is still connecting, since the connecting overlay takes over from
 * there; only a connection that already failed sends the user back to the
 * saved list, where its error shows.
 */
export const closesAfterSave = (status: ConnectionStatus): boolean =>
  status !== "error" && status !== "disconnected" && status !== "disconnecting";
