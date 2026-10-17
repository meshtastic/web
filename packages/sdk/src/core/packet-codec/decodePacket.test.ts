import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../client/MeshClient.ts";
import type { PacketMetadata } from "../types.ts";
import { createFakeTransport } from "../testing/createFakeTransport.ts";
import { hopsAway } from "./decodePacket.ts";

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

function setup() {
  const fake = createFakeTransport();
  const client = new MeshClient({
    transport: fake.transport,
    heartbeatIntervalMs: false,
  });
  return { ...fake, client };
}

let nextId = 1;

function dataPacket(
  portnum: Protobuf.Portnums.PortNum,
  payload: Uint8Array,
  init: { id?: number; rxTime?: number } = {},
) {
  return create(Protobuf.Mesh.MeshPacketSchema, {
    from: 0x10,
    to: 0xffffffff,
    id: init.id ?? nextId++,
    rxTime: init.rxTime,
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

  it("drops a packet it has already delivered", async () => {
    const { client, respond } = setup();
    const alerts: string[] = [];
    client.events.onAlertPacket.subscribe((p) => alerts.push(p.data));
    const payload = new TextEncoder().encode("smoke");

    respond.withMeshPacket(
      dataPacket(Protobuf.Portnums.PortNum.ALERT_APP, payload, { id: 99 }),
    );
    respond.withMeshPacket(
      dataPacket(Protobuf.Portnums.PortNum.ALERT_APP, payload, { id: 99 }),
    );
    respond.withMeshPacket(
      dataPacket(Protobuf.Portnums.PortNum.ALERT_APP, payload, { id: 100 }),
    );
    await flush();
    expect(alerts).toEqual(["smoke", "smoke"]);
  });

  it("stamps packets without rx_time with the time they arrived", async () => {
    const { client, respond } = setup();
    const times: number[] = [];
    client.events.onAlertPacket.subscribe((p) =>
      times.push(p.rxTime.getTime()),
    );
    const before = Date.now();

    respond.withMeshPacket(
      dataPacket(Protobuf.Portnums.PortNum.ALERT_APP, new Uint8Array()),
    );
    respond.withMeshPacket(
      dataPacket(Protobuf.Portnums.PortNum.ALERT_APP, new Uint8Array(), {
        rxTime: 1_700_000_000,
      }),
    );
    await flush();
    expect(times[0]).toBeGreaterThanOrEqual(before);
    expect(times[1]).toBe(1_700_000_000_000);
  });

  it("carries how the radio heard a packet, keeping 0 dB apart from no reading", async () => {
    const { client, respond } = setup();
    const heard: PacketMetadata<string>[] = [];
    client.events.onMessagePacket.subscribe((p) => heard.push(p));
    const text = new TextEncoder().encode("hi");

    respond.withMeshPacket(
      create(Protobuf.Mesh.MeshPacketSchema, {
        ...dataPacket(Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP, text),
        rxSnr: 0,
        rxRssi: -90,
        hopStart: 3,
        hopLimit: 3,
        transportMechanism:
          Protobuf.Mesh.MeshPacket_TransportMechanism.TRANSPORT_LORA,
      }),
    );
    respond.withMeshPacket(
      create(Protobuf.Mesh.MeshPacketSchema, {
        ...dataPacket(Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP, text),
        hopStart: 3,
        hopLimit: 1,
        viaMqtt: true,
        transportMechanism:
          Protobuf.Mesh.MeshPacket_TransportMechanism.TRANSPORT_MQTT,
      }),
    );
    await flush();

    expect(heard[0]).toMatchObject({ rxSnr: 0, rxRssi: -90, hopsAway: 0 });
    expect(heard[1]).toMatchObject({
      rxSnr: undefined,
      rxRssi: undefined,
      hopsAway: 2,
      viaMqtt: true,
      transportMechanism:
        Protobuf.Mesh.MeshPacket_TransportMechanism.TRANSPORT_MQTT,
    });
  });
});

describe("hopsAway", () => {
  it("is hop_start minus hop_limit", () => {
    expect(hopsAway(3, 3)).toBe(0);
    expect(hopsAway(7, 4)).toBe(3);
  });

  it("is unknown without a hop_start or with hop_limit above it", () => {
    expect(hopsAway(0, 3)).toBeUndefined();
    expect(hopsAway(2, 3)).toBeUndefined();
  });
});
