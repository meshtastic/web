import type { Connection } from "@data/schema";
import type { TransportHTTP } from "@meshtastic/transport-http";
import type { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import type { TransportWebSerial } from "@meshtastic/transport-web-serial";

export type PacketTransport =
  | Awaited<ReturnType<typeof TransportHTTP.create>>
  | Awaited<ReturnType<typeof TransportWebBluetooth.createFromDevice>>
  | Awaited<ReturnType<typeof TransportWebSerial.createFromPort>>;

export interface ConnectionResult {
  transport: PacketTransport;
  nativeHandle?: any;
  onDisconnect?: () => void;
}

export interface ConnectionStrategy {
  connect(
    connection: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<ConnectionResult>;

  disconnect(nativeHandle?: any): Promise<void>;
}
