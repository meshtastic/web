import type * as Protobuf from "@meshtastic/protobufs";

interface Packet {
  type: "packet";
  data: Uint8Array;
}

interface DebugLog {
  type: "debug";
  data: string;
}

interface StatusEvent {
  type: "status";
  data: { status: DeviceStatusEnum; reason?: string };
}

export type DeviceOutput = Packet | DebugLog | StatusEvent;

export interface Transport {
  toDevice: WritableStream<Uint8Array>;
  fromDevice: ReadableStream<DeviceOutput>;
  disconnect(): Promise<void>;
}

export interface QueueItem {
  id: number;
  data: Uint8Array;
  sent: boolean;
  added: Date;
  promise: Promise<number>;
}

export interface HttpRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

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

export type LogEventPacket = LogEvent & { date: Date };

export type PacketDestination = "broadcast" | "direct";

export interface PacketMetadata<T> {
  id: number;
  rxTime: Date;
  type: PacketDestination;
  from: number;
  to: number;
  channel: ChannelNumber;
  data: T;
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
