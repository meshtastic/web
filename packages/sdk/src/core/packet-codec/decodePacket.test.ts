import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../client/MeshClient.ts";
import { createFakeTransport } from "../testing/createFakeTransport.ts";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

function setup() {
  const fake = createFakeTransport();
  const client = new MeshClient({
    transport: fake.transport,
    heartbeatIntervalMs: false,
  });
  return { ...fake, client };
}

function dataPacket(portnum: Protobuf.Portnums.PortNum, payload: Uint8Array) {
  return create(Protobuf.Mesh.MeshPacketSchema, {
    from: 0x10,
    to: 0xffffffff,
    id: 7,
    payloadVariant: { case: "decoded", value: { portnum, payload } },
  });
}

describe("decodePacket", () => {
  it("records lockdown status and region presets on the device slice", async () => {
    const { client, respond } = setup();
    respond.withRaw(
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: {
          case: "lockdownStatus",
          value: { state: Protobuf.Mesh.LockdownStatus_State.LOCKED },
        },
      }),
    );
    respond.withRaw(
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: { case: "regionPresets", value: {} },
      }),
    );
    await flush();
    expect(client.device.lockdownStatus.value?.state).toBe(
      Protobuf.Mesh.LockdownStatus_State.LOCKED,
    );
    expect(client.device.regionPresets.value).toBeDefined();
  });

  it("decodes node status and mesh beacon packets", async () => {
    const { client, respond } = setup();
    const statuses: string[] = [];
    const beacons: string[] = [];
    client.events.onNodeStatusPacket.subscribe((p) =>
      statuses.push(p.data.status),
    );
    client.events.onMeshBeaconPacket.subscribe((p) =>
      beacons.push(p.data.message),
    );

    respond.withMeshPacket(
      dataPacket(
        Protobuf.Portnums.PortNum.NODE_STATUS_APP,
        toBinary(
          Protobuf.Mesh.StatusMessageSchema,
          create(Protobuf.Mesh.StatusMessageSchema, { status: "on the hill" }),
        ),
      ),
    );
    respond.withMeshPacket(
      dataPacket(
        Protobuf.Portnums.PortNum.MESH_BEACON_APP,
        toBinary(
          Protobuf.MeshBeacon.MeshBeaconSchema,
          create(Protobuf.MeshBeacon.MeshBeaconSchema, { message: "join us" }),
        ),
      ),
    );
    await flush();
    expect(statuses).toEqual(["on the hill"]);
    expect(beacons).toEqual(["join us"]);
  });

  it("passes packets on unknown portnums through instead of dropping them", async () => {
    const { client, respond } = setup();
    const seen: Protobuf.Portnums.PortNum[] = [];
    client.events.onUnhandledPacket.subscribe((p) => seen.push(p.data.portnum));

    respond.withMeshPacket(
      dataPacket(Protobuf.Portnums.PortNum.PAGING_APP, new Uint8Array([1, 2])),
    );
    const unknownPort = 400 as Protobuf.Portnums.PortNum;
    respond.withMeshPacket(dataPacket(unknownPort, new Uint8Array([3])));
    await flush();
    expect(seen).toEqual([Protobuf.Portnums.PortNum.PAGING_APP, unknownPort]);
  });
});
