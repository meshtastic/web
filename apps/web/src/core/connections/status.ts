import type {
  Connection,
  ConnectionId,
  ConnectionStatus,
} from "@app/core/stores/deviceStore/types";

/** Statuses that mean the handshake finished: the app is talking to a radio. */
export const reachedRadio = (status: ConnectionStatus | undefined): boolean =>
  status === "configured" || status === "connected";

export type StatusPatch = Pick<Connection, "status"> &
  Partial<Pick<Connection, "lastConnectedAt" | "pending">>;

/**
 * Saved-connection fields for a status change. `lastConnectedAt` is when the
 * app last talked to the radio: stamped when the handshake finishes, and
 * again when that session ends (disconnect, drop or reconnect). A connect that never got that far leaves it
 * alone, so "Never connected" stays true and the overlay keeps its
 * first-connect copy. Reaching the radio also ends the attempt's `pending`.
 */
export function nextConnectionPatch(
  prev: ConnectionStatus | undefined,
  status: ConnectionStatus,
  now: number,
): StatusPatch {
  if (reachedRadio(status)) {
    return { status, lastConnectedAt: now, pending: undefined };
  }
  if (reachedRadio(prev)) {
    return { status, lastConnectedAt: now };
  }
  return { status };
}

/**
 * A saved connection created by a connect attempt that never reached a
 * radio. `nodeNum` arrives with the handshake's my_info, so an entry that
 * has one has talked to a radio even if the handshake was cut short.
 */
export const isUnfinishedAttempt = (conn: Connection): boolean =>
  conn.pending === true &&
  conn.nodeNum === undefined &&
  conn.lastConnectedAt === undefined;

/**
 * Drops unfinished attempts from connections loaded at startup. Each connect
 * attempt saves its entry before the radio answers (the picked port or
 * device has to be kept somewhere); the attempt clears `pending` once it
 * finishes. A reload or closed tab mid-attempt skips every cleanup, so an
 * entry still pending at startup belongs to an attempt that can no longer
 * finish.
 */
export const pruneUnfinishedAttempts = (
  connections: readonly Connection[],
): Connection[] => connections.filter((c) => !isUnfinishedAttempt(c));

/**
 * Whether two saved connections point at the same radio as far as the
 * browser can tell. Web Serial only exposes the USB vendor and product ids,
 * so two identical radios look the same: this is only safe for discarding
 * entries that never reached a radio, never for merging real ones.
 */
function sameTarget(a: Connection, b: Connection): boolean {
  switch (a.type) {
    case "http":
      return b.type === "http" && a.url === b.url;
    case "bluetooth":
      return (
        b.type === "bluetooth" &&
        a.deviceId !== undefined &&
        a.deviceId === b.deviceId
      );
    case "serial":
      return (
        b.type === "serial" &&
        a.usbVendorId !== undefined &&
        a.usbVendorId === b.usbVendorId &&
        a.usbProductId === b.usbProductId
      );
  }
}

/** Neither pending nor ever connected: what an older build left behind. */
const neverReached = (conn: Connection): boolean =>
  conn.nodeNum === undefined && conn.lastConnectedAt === undefined;

const inFlight = (conn: Connection): boolean =>
  conn.status === "connecting" ||
  conn.status === "configuring" ||
  reachedRadio(conn.status);

/**
 * Entries made redundant once `reached` connects: other entries for the same
 * transport and device ids that never reached any radio and are not in use.
 * Covers attempts the wizard or drawer left behind (a reload, a failed try
 * before the one that worked) including ones saved before `pending`
 * existed. An entry that ever connected is kept even when its ids match,
 * since it may be a second, identical radio.
 */
export function supersededAttempts(
  connections: readonly Connection[],
  reached: Connection,
): ConnectionId[] {
  return connections
    .filter(
      (c) =>
        c.id !== reached.id &&
        !c.isDefault &&
        neverReached(c) &&
        !inFlight(c) &&
        sameTarget(reached, c),
    )
    .map((c) => c.id);
}

/**
 * The saved connection to offer a one-click reconnect to: the radio reached
 * most recently. Entries that never reached a radio are skipped.
 */
export function mostRecentConnection(
  connections: readonly Connection[],
): Connection | undefined {
  let best: Connection | undefined;
  let bestAt = Number.NEGATIVE_INFINITY;
  for (const conn of connections) {
    if (neverReached(conn)) continue;
    const at = conn.lastConnectedAt ?? conn.createdAt;
    if (at > bestAt) {
      best = conn;
      bestAt = at;
    }
  }
  return best;
}

/**
 * The saved connections to keep at startup, once no session is live: drops
 * unfinished attempts, and entries that never reached a radio when another
 * entry for the same transport and ids did (left by builds before
 * `pending`, see supersededAttempts).
 */
export function pruneAtStartup(
  connections: readonly Connection[],
): Connection[] {
  const kept = pruneUnfinishedAttempts(connections);
  const dropped = new Set<ConnectionId>();
  for (const conn of kept) {
    if (neverReached(conn) || dropped.has(conn.id)) continue;
    for (const id of supersededAttempts(kept, conn)) dropped.add(id);
  }
  return kept.filter((c) => !dropped.has(c.id));
}
