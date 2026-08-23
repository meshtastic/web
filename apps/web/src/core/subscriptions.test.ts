import {
  EventBus,
  type MeshDevice,
  type PacketMetadata,
  Protobuf,
} from "@meshtastic/sdk";
import { describe, expect, it, vi } from "vitest";
import { mockDeviceStore } from "./stores/deviceStore/deviceStore.mock.ts";
import { subscribeAll } from "./subscriptions.ts";

function routingPacket(
  value: Protobuf.Mesh.Routing_Error,
): PacketMetadata<Protobuf.Mesh.Routing> {
  return {
    id: 1,
    from: 99,
    to: 0xffffffff,
    channel: 0,
    type: "broadcast",
    rxTime: new Date(),
    data: {
      variant: {
        case: "errorReason",
        value,
      },
    } as Protobuf.Mesh.Routing,
  };
}

describe("subscribeAll routing errors", () => {
  it.each([
    Protobuf.Mesh.Routing_Error.NO_CHANNEL,
    Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY,
  ])("does not open refreshKeys for %s", (reason) => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const events = new EventBus();
    const device = {
      ...mockDeviceStore,
      setDialogOpen: vi.fn(),
    };

    subscribeAll(device, { events } as MeshDevice);

    events.onRoutingPacket.dispatch(routingPacket(reason));

    expect(device.setDialogOpen).not.toHaveBeenCalled();
  });
});
