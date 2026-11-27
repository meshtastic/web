import type { Protobuf } from "@core/protobuf.ts";

export enum DeviceStatusEnum {
  DeviceRestarting = 1,
  DeviceDisconnected = 2,
  DeviceConnecting = 3,
  DeviceReconnecting = 4,
  DeviceConnected = 5,
  DeviceConfiguring = 6,
  DeviceConfigured = 7,
  DeviceError = 8,
}

export enum ChannelNumber {
  Primary = 0,
  Channel1 = 1,
  Channel2 = 2,
  Channel3 = 3,
  Channel4 = 4,
  Channel5 = 5,
  Channel6 = 6,
  Admin = 7,
}

export type Destination = number | "self" | "broadcast";

export type PacketDestination = "broadcast" | "direct";

export interface PacketMetadata<T> {
  id: number;
  rxTime: Date;
  type: PacketDestination;
  from: number;
  to: number;
  channel: ChannelNumber;
  data: T;
  /** Data.request_id: the packet this one answers or acks. */
  requestId?: number;
  /** Data.reply_id: the packet this one replies or reacts to. */
  replyId?: number;
  /** Data.emoji: non-zero marks a text packet as a tapback reaction. */
  emoji?: number;
  /** The sender signed the packet with XEdDSA and the device verified it. */
  xeddsaSigned?: boolean;
  /** Firmware's verdict on an ack's proof of delivery (2.8.1+). */
  ackProofStatus?: Protobuf.Mesh.MeshPacket_AckProofStatus;
  /** SNR in dB as our radio heard the packet; undefined when unmeasured. */
  rxSnr?: number;
  /** RSSI in dBm as our radio heard the packet; undefined when unmeasured. */
  rxRssi?: number;
  /** Hops the packet took to reach us; undefined when it can't be told. */
  hopsAway?: number;
  /** The packet reached the mesh through an MQTT gateway. */
  viaMqtt?: boolean;
  /** How the packet reached our radio (LoRa, MQTT, UDP, API...). */
  transportMechanism?: Protobuf.Mesh.MeshPacket_TransportMechanism;
  /** MeshPacket.relay_node: last byte of the relaying node's number; 0 when unset. */
  relayNode?: number;
}
