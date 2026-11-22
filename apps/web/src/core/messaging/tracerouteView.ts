/**
 * A traceroute result shown in a card in a direct conversation. The response
 * packet comes back from the traced node, so its `to` is the origin (this
 * radio) and its `from` the destination; SNR values arrive in quarter dB.
 */

export interface TracerouteInput {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly rxTime: Date;
  readonly data: {
    readonly route: readonly number[];
    readonly routeBack: readonly number[];
    readonly snrTowards: readonly number[];
    readonly snrBack: readonly number[];
  };
}

/** SNR the firmware reports for a hop it couldn't measure. */
export const UNKNOWN_SNR = -128;

export interface TracerouteView {
  readonly id: number;
  /** The packet's sender: the traced node. */
  readonly from: number;
  readonly at: Date;
  /** Every node on the way out, origin and destination included. */
  readonly path: readonly number[];
  /** dB per hop on the way out (`path.length - 1` entries when complete). */
  readonly snrTowards: readonly (number | undefined)[];
  /** Nodes on the way back, origin and destination included; empty if none came back. */
  readonly pathBack: readonly number[];
  readonly snrBack: readonly (number | undefined)[];
  /** The return path retraces the outbound one. */
  readonly sameReturn: boolean;
}

const toDb = (quarterDb: number): number | undefined =>
  quarterDb === UNKNOWN_SNR ? undefined : quarterDb / 4;

const sameItems = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i]);

export const toTracerouteView = (packet: TracerouteInput): TracerouteView => {
  const origin = packet.to;
  const destination = packet.from;
  const path = [origin, ...packet.data.route, destination];
  const hasReturn =
    packet.data.routeBack.length > 0 || packet.data.snrBack.length > 0;
  const pathBack = hasReturn
    ? [destination, ...packet.data.routeBack, origin]
    : [];
  return {
    id: packet.id,
    from: packet.from,
    at: packet.rxTime,
    path,
    snrTowards: packet.data.snrTowards.map(toDb),
    pathBack,
    snrBack: packet.data.snrBack.map(toDb),
    sameReturn: hasReturn && sameItems([...pathBack].reverse(), path),
  };
};

/**
 * The traceroutes to show in a conversation with `peer`: the ones that
 * peer answered, oldest first.
 */
export const traceroutesForPeer = (
  byResponder: ReadonlyMap<number, readonly TracerouteInput[]>,
  peer: number,
): TracerouteView[] =>
  (byResponder.get(peer) ?? [])
    .map(toTracerouteView)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
