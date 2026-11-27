import { Protobuf } from "@core/protobuf.ts";
import type { Message } from "@core/storage/types.ts";

/**
 * The relaying node of a packet, after the Android app (`Node.getRelayNode`
 * and `RelayNodeLabel.kt`, design#33).
 *
 * A packet's header carries only the last byte of the node number of the
 * node that transmitted it to us (`MeshPacket.relay_node`, firmware 2.6+).
 * 0 means no relay was recorded, so a node whose number ends in `00` can
 * never be named this way. One byte can match several known nodes, so the
 * name is a best guess; the byte itself is the only certain part.
 */

const RELAY_BYTE_MASK = 0xff;

/** What the resolver needs from a known node. */
export interface RelayCandidate {
  readonly num: number;
  /** Seconds; 0 when the node was never heard. */
  readonly lastHeard: number;
  /** Undefined when unknown. */
  readonly hopsAway?: number;
  readonly user?: { readonly longName?: string | null };
}

/** The relay byte, or undefined when none was recorded (0 or absent). */
export const relayByte = (
  relayNode: number | undefined,
): number | undefined => {
  const byte = (relayNode ?? 0) & RELAY_BYTE_MASK;
  return byte === 0 ? undefined : byte;
};

/** `0x5A`: upper-case, two digits. */
export const relayHex = (byte: number): string =>
  `0x${(byte & RELAY_BYTE_MASK).toString(16).toUpperCase().padStart(2, "0")}`;

const LORA_TRANSPORTS: ReadonlySet<number> = new Set([
  Protobuf.Mesh.MeshPacket_TransportMechanism.TRANSPORT_LORA,
  Protobuf.Mesh.MeshPacket_TransportMechanism.TRANSPORT_LORA_ALT1,
  Protobuf.Mesh.MeshPacket_TransportMechanism.TRANSPORT_LORA_ALT2,
  Protobuf.Mesh.MeshPacket_TransportMechanism.TRANSPORT_LORA_ALT3,
]);

/**
 * The packet's relay byte names the RF hop that delivered it. Firmware
 * zeroes it on MQTT downlink but keeps `via_mqtt` through later LoRa hops;
 * before 2.7.5 it sent no transport, so `via_mqtt` decides alone (Android
 * `relayIsRfHop`).
 */
const relayIsRfHop = (
  transport: number | undefined,
  viaMqtt: boolean | undefined,
): boolean =>
  (transport !== undefined && LORA_TRANSPORTS.has(transport)) || !viaMqtt;

/** The header fields that decide whether a relay byte names a relay. */
export type RelayHeader = Pick<
  Message,
  "relayNode" | "hopsAway" | "viaMqtt" | "transport"
>;

/**
 * The relay byte of a received packet or ack, or undefined when it names no
 * relay. Every node stamps its own byte when it transmits, so a packet heard
 * direct (0 hops) carries the sender's own byte, and one handed over by
 * MQTT names no RF hop. Unknown hops keep the byte: an implicit ack is built
 * by our radio with `hop_start` 0 from an overheard rebroadcast, so its
 * byte is the relayer's (Android `receivedRelayNode`, `ackRelayNode`).
 */
export const packetRelayNode = (header: RelayHeader): number | undefined =>
  header.hopsAway === 0 || !relayIsRfHop(header.transport, header.viaMqtt)
    ? undefined
    : relayByte(header.relayNode);

/** Unknown hops rank after every known hop count. */
const hopRank = (hops: number | undefined): number =>
  hops === undefined || hops < 0 ? Number.POSITIVE_INFINITY : hops;

/**
 * The known node most likely behind a relay byte: one whose number ends in
 * it, never our own node and never one that was never heard. Fewest hops
 * wins, unknown hops last, then the most recently heard.
 */
export const resolveRelayNode = <T extends RelayCandidate>(
  relayNode: number | undefined,
  nodes: readonly T[],
  myNodeNum: number | undefined,
): T | undefined => {
  const byte = relayByte(relayNode);
  if (byte === undefined) return undefined;
  let best: T | undefined;
  for (const node of nodes) {
    if (
      node.num === myNodeNum ||
      node.lastHeard === 0 ||
      (node.num & RELAY_BYTE_MASK) !== byte
    ) {
      continue;
    }
    if (
      !best ||
      hopRank(node.hopsAway) < hopRank(best.hopsAway) ||
      (hopRank(node.hopsAway) === hopRank(best.hopsAway) &&
        node.lastHeard > best.lastHeard)
    ) {
      best = node;
    }
  }
  return best;
};

/**
 * The relay as shown: `Name (0x5A)`, or `0x5A` alone when no known node
 * ends in that byte or the match has no long name. Undefined when no relay
 * was recorded.
 */
export const relayNodeLabel = (
  relayNode: number | undefined,
  nodes: readonly RelayCandidate[],
  myNodeNum: number | undefined,
): string | undefined => {
  const byte = relayByte(relayNode);
  if (byte === undefined) return undefined;
  const hex = relayHex(byte);
  const name = resolveRelayNode(byte, nodes, myNodeNum)?.user?.longName?.trim();
  return name ? `${name} (${hex})` : hex;
};

/**
 * The relay byte a message's details name: for a received message the node
 * that relayed it to us, unless it came direct or over MQTT; for an outgoing
 * one the relay of its latest ack, already filtered when the ack arrived.
 */
export const shownRelayNode = (
  message: RelayHeader,
  outgoing: boolean,
): number | undefined =>
  outgoing ? relayByte(message.relayNode) : packetRelayNode(message);
