import type * as Protobuf from "@meshtastic/protobufs";

export type {
  DeviceOutput,
  HttpRetryConfig,
  Transport,
} from "./transport/Transport.ts";
export { DeviceStatusEnum } from "./transport/Transport.ts";

export interface QueueItem {
  id: number;
  data: Uint8Array;
  sent: boolean;
  added: Date;
  promise: Promise<number>;
}

export type LogEventPacket = LogEvent & { date: Date };

export type PacketDestination = "broadcast" | "direct";

export interface UnhandledPayload {
  portnum: Protobuf.Portnums.PortNum;
  payload: Uint8Array;
}

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
  /** The sender signed the packet with XEdDSA and the device verified it. */
  xeddsaSigned?: boolean;
  /** Firmware's verdict on an ack's proof of delivery (2.8.1+). */
  ackProofStatus?: Protobuf.Mesh.MeshPacket_AckProofStatus;
  /**
   * SNR in dB as our radio heard the packet, or undefined when it carried no
   * measurement. 0 dB is a real reading.
   */
  rxSnr?: number;
  /** RSSI in dBm as our radio heard the packet, or undefined when unset. */
  rxRssi?: number;
  /** Hops the packet took to reach us, or undefined when it can't be told. */
  hopsAway?: number;
  /** The packet reached the mesh through an MQTT gateway. */
  viaMqtt?: boolean;
  /** How the packet reached our radio (LoRa, MQTT, UDP, API...). */
  transportMechanism?: Protobuf.Mesh.MeshPacket_TransportMechanism;
}

export enum EmitterScope {
  MeshDevice = 1,
  SerialConnection = 2,
  NodeSerialConnection = 3,
  BleConnection = 4,
  HttpConnection = 5,
}

export enum Emitter {
  Constructor = 0,
  SendText = 1,
  SendWaypoint = 2,
  SendPacket = 3,
  SendRaw = 4,
  SetConfig = 5,
  SetModuleConfig = 6,
  ConfirmSetConfig = 7,
  SetOwner = 8,
  SetChannel = 9,
  ConfirmSetChannel = 10,
  ClearChannel = 11,
  GetChannel = 12,
  GetAllChannels = 13,
  GetConfig = 14,
  GetModuleConfig = 15,
  GetOwner = 16,
  Configure = 17,
  HandleFromRadio = 18,
  HandleMeshPacket = 19,
  Connect = 20,
  Ping = 21,
  ReadFromRadio = 22,
  WriteToRadio = 23,
  SetDebugMode = 24,
  GetMetadata = 25,
  ResetNodes = 26,
  Shutdown = 27,
  Reboot = 28,
  RebootOta = 29,
  FactoryReset = 30,
  EnterDfuMode = 31,
  RemoveNodeByNum = 32,
  SetCannedMessages = 33,
  Disconnect = 34,
  ConnectionStatus = 35,
}

export interface LogEvent {
  scope: EmitterScope;
  emitter: Emitter;
  message: string;
  level: Protobuf.Mesh.LogRecord_Level;
  packet?: Uint8Array;
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

export interface PacketError {
  id: number;
  error: Protobuf.Mesh.Routing_Error;
}
