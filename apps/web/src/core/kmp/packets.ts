import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf, type Types } from "@core/protobuf.ts";

export const BROADCAST_NUM = 0xffffffff;

/**
 * Hops the packet took, from hop_start and hop_limit. Unknown when hop_start
 * is 0 (firmware older than 2.3, which didn't set it) or hop_limit is above it.
 */
export function hopsAway(
  hopStart: number,
  hopLimit: number,
): number | undefined {
  if (hopStart === 0 || hopLimit > hopStart) return undefined;
  return hopStart - hopLimit;
}

/**
 * Metadata of an inbound packet. rx_snr is a plain proto3 float, so 0 can
 * mean a 0 dB reading or no reading; rx_rssi is only set when the radio
 * measured the packet, so it tells the two apart.
 */
export function packetMetadata(
  packet: Protobuf.Mesh.MeshPacket,
  data: Protobuf.Mesh.Data,
): Omit<Types.PacketMetadata<never>, "data"> {
  const measured = packet.rxRssi !== undefined || packet.rxSnr !== 0;
  return {
    id: packet.id,
    rxTime: packet.rxTime ? new Date(packet.rxTime * 1000) : new Date(),
    type: packet.to === BROADCAST_NUM ? "broadcast" : "direct",
    from: packet.from,
    to: packet.to,
    channel: packet.channel,
    requestId: data.requestId || undefined,
    replyId: data.replyId || undefined,
    emoji: data.emoji || undefined,
    xeddsaSigned: packet.xeddsaSigned,
    ackProofStatus: packet.ackProofStatus,
    rxSnr: measured ? packet.rxSnr : undefined,
    rxRssi: packet.rxRssi,
    hopsAway: hopsAway(packet.hopStart, packet.hopLimit),
    viaMqtt: packet.viaMqtt,
    transportMechanism: packet.transportMechanism,
    relayNode: packet.relayNode,
  };
}

export function withData<T>(
  meta: Omit<Types.PacketMetadata<never>, "data">,
  data: T,
): Types.PacketMetadata<T> {
  return { ...meta, data };
}

export interface OutboundPacket {
  payload: Uint8Array;
  portNum: Protobuf.Portnums.PortNum;
  destination: Types.Destination;
  channel?: Types.ChannelNumber;
  wantAck?: boolean;
  wantResponse?: boolean;
}

/** Encodes a MeshPacket for the facade's `sendPacket`; the SDK assigns the id. */
export function encodeOutbound(
  packet: OutboundPacket,
  myNodeNum: number,
): Uint8Array {
  const to =
    packet.destination === "broadcast"
      ? BROADCAST_NUM
      : packet.destination === "self"
        ? myNodeNum
        : packet.destination;
  return toBinary(
    Protobuf.Mesh.MeshPacketSchema,
    create(Protobuf.Mesh.MeshPacketSchema, {
      to,
      channel: packet.channel ?? 0,
      wantAck: packet.wantAck ?? false,
      payloadVariant: {
        case: "decoded",
        value: create(Protobuf.Mesh.DataSchema, {
          portnum: packet.portNum,
          payload: packet.payload,
          wantResponse: packet.wantResponse ?? false,
        }),
      },
    }),
  );
}

export function decodeMeshPacket(bytes: Uint8Array): Protobuf.Mesh.MeshPacket {
  return fromBinary(Protobuf.Mesh.MeshPacketSchema, bytes);
}

export function decodeFromRadio(bytes: Uint8Array): Protobuf.Mesh.FromRadio {
  return fromBinary(Protobuf.Mesh.FromRadioSchema, bytes);
}
