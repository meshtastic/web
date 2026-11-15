import type { ConnectionStateJs, MeshtasticClient } from "@meshtastic/sdk-kmp";
import {
  type DeviceOutput,
  DeviceStatusEnum,
  type Transport,
} from "@meshtastic/sdk";

function toDeviceStatus(
  state: ConnectionStateJs,
): DeviceStatusEnum | undefined {
  switch (state.kind) {
    case "connected":
      return DeviceStatusEnum.DeviceConnected;
    case "reconnecting":
      return DeviceStatusEnum.DeviceReconnecting;
    case "disconnected":
      return DeviceStatusEnum.DeviceDisconnected;
    default:
      return undefined;
  }
}

/**
 * Presents a Kotlin SDK client as the TypeScript SDK's `Transport`, so the
 * existing `MeshDevice` keeps feeding the stores while the Kotlin SDK owns
 * the connection: every FromRadio frame the SDK receives is replayed here
 * as bare protobuf bytes, and every ToRadio the web client writes goes
 * through the SDK's send path.
 */
export function kmpTransport(client: MeshtasticClient): Transport {
  let controller: ReadableStreamDefaultController<DeviceOutput> | undefined;
  let closed = false;
  const unsubscribe: Array<() => void> = [];

  const close = (): void => {
    if (closed) {
      return;
    }
    closed = true;
    for (const off of unsubscribe) {
      off();
    }
    controller?.close();
  };

  const fromDevice = new ReadableStream<DeviceOutput>({
    start(c) {
      controller = c;
      unsubscribe.push(
        client.onFromRadio((bytes) => {
          if (!closed) {
            c.enqueue({ type: "packet", data: bytes });
          }
        }),
        client.onConnectionState((state) => {
          const status = toDeviceStatus(state);
          if (status !== undefined && !closed) {
            c.enqueue({ type: "status", data: { status } });
          }
        }),
      );
    },
    cancel() {
      close();
    },
  });

  const toDevice = new WritableStream<Uint8Array>({
    write(chunk) {
      client.sendRaw(chunk);
    },
  });

  return {
    fromDevice,
    toDevice,
    async disconnect() {
      close();
      await client.disconnect();
    },
  };
}
