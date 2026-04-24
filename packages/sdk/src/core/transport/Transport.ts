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

export interface HttpRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}
