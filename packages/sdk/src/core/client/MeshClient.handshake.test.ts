import { create, fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FirmwareTooOldError,
  HandshakeTimeoutError,
} from "../errors/MeshError.ts";
import { createFakeTransport } from "../testing/createFakeTransport.ts";
import { DeviceStatusEnum } from "../transport/Transport.ts";
import { MeshClient } from "./MeshClient.ts";
import {
  CONFIG_NONCE,
  HANDSHAKE_IDLE_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  NODEDB_NONCE,
} from "./handshake.ts";

const decodeSent = (sent: Uint8Array[]) =>
  sent.map((bytes) => fromBinary(Protobuf.Mesh.ToRadioSchema, bytes));

const wantConfigIds = (sent: Uint8Array[]) =>
  decodeSent(sent)
    .filter((m) => m.payloadVariant.case === "wantConfigId")
    .map((m) => m.payloadVariant.value);

const heartbeatNonces = (sent: Uint8Array[]) =>
  decodeSent(sent).flatMap((m) =>
    m.payloadVariant.case === "heartbeat" ? [m.payloadVariant.value.nonce] : [],
  );

describe("MeshClient handshake", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup() {
    const fake = createFakeTransport();
    const client = new MeshClient({ transport: fake.transport });
    const done = client.configure();
    done.catch(() => {});
    await vi.advanceTimersByTimeAsync(500);
    return { ...fake, client, done };
  }

  it("asks for config first, then the NodeDB after a heartbeat", async () => {
    const { client, respond, sent, done } = await setup();
    expect(wantConfigIds(sent)).toEqual([CONFIG_NONCE]);

    respond.withConfigCompleteId(CONFIG_NONCE);
    await vi.advanceTimersByTimeAsync(1_000);

    const kinds = decodeSent(sent).map((m) => m.payloadVariant.case);
    expect(kinds).toEqual(["wantConfigId", "heartbeat", "wantConfigId"]);
    expect(wantConfigIds(sent)).toEqual([CONFIG_NONCE, NODEDB_NONCE]);
    expect(client.device.status.value).toBe(DeviceStatusEnum.DeviceConfiguring);

    respond.withConfigCompleteId(NODEDB_NONCE);
    await vi.advanceTimersByTimeAsync(10);
    await expect(done).resolves.toBe(NODEDB_NONCE);
    expect(client.device.status.value).toBe(DeviceStatusEnum.DeviceConfigured);
  });

  it("ignores a config_complete_id that does not match the stage", async () => {
    const { client, respond, sent } = await setup();
    respond.withConfigCompleteId(NODEDB_NONCE);
    respond.withConfigCompleteId(12345);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(wantConfigIds(sent)).toEqual([CONFIG_NONCE]);
    expect(client.device.status.value).toBe(DeviceStatusEnum.DeviceConfiguring);
  });

  it("sets the device clock when my_info arrives", async () => {
    const { respond, sent } = await setup();
    respond.withMyNodeInfo({ myNodeNum: 0x1234 });
    await vi.advanceTimersByTimeAsync(1_000);

    const packets = decodeSent(sent).flatMap((m) =>
      m.payloadVariant.case === "packet" ? [m.payloadVariant.value] : [],
    );
    expect(packets).toHaveLength(1);
    const packet = packets[0]!;
    expect(packet.to).toBe(0x1234);
    expect(packet.wantAck).toBe(false);
    if (packet.payloadVariant.case !== "decoded") throw new Error("encrypted");
    const admin = fromBinary(
      Protobuf.Admin.AdminMessageSchema,
      packet.payloadVariant.value.payload,
    );
    expect(admin.payloadVariant.case).toBe("setTimeOnly");
  });

  it("asks again once when the device stalls, then fails", async () => {
    const { sent, done } = await setup();
    await vi.advanceTimersByTimeAsync(HANDSHAKE_IDLE_TIMEOUT_MS);
    expect(wantConfigIds(sent)).toEqual([CONFIG_NONCE, CONFIG_NONCE]);

    await vi.advanceTimersByTimeAsync(HANDSHAKE_IDLE_TIMEOUT_MS);
    await expect(done).rejects.toBeInstanceOf(HandshakeTimeoutError);
  });

  it("keeps waiting while frames keep arriving", async () => {
    const { respond, sent, done } = await setup();
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(HANDSHAKE_IDLE_TIMEOUT_MS - 1_000);
      respond.withNodeInfo({ num: i + 1 });
    }
    await vi.advanceTimersByTimeAsync(10);
    expect(wantConfigIds(sent)).toEqual([CONFIG_NONCE]);
    let settled = false;
    done.then(
      () => (settled = true),
      () => (settled = true),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
  });

  it("sends counting heartbeats from 2 once configured", async () => {
    const { respond, sent } = await setup();
    respond.withConfigCompleteId(CONFIG_NONCE);
    await vi.advanceTimersByTimeAsync(1_000);
    respond.withConfigCompleteId(NODEDB_NONCE);
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2 + 1_000);

    const nonces = heartbeatNonces(sent);
    expect(nonces).toEqual([2, 3, 4]);
    expect(nonces).not.toContain(0);
    expect(nonces).not.toContain(1);
  });

  it("restarts from the config stage when the device reboots", async () => {
    const { client, respond, sent } = await setup();
    respond.withConfigCompleteId(CONFIG_NONCE);
    await vi.advanceTimersByTimeAsync(1_000);
    respond.withConfigCompleteId(NODEDB_NONCE);
    await vi.advanceTimersByTimeAsync(10);
    expect(client.device.status.value).toBe(DeviceStatusEnum.DeviceConfigured);

    respond.withRaw(
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: { case: "rebooted", value: true },
      }),
    );
    await vi.advanceTimersByTimeAsync(500);
    expect(wantConfigIds(sent)).toEqual([
      CONFIG_NONCE,
      NODEDB_NONCE,
      CONFIG_NONCE,
    ]);
    expect(client.device.status.value).toBe(DeviceStatusEnum.DeviceConfiguring);
  });

  it("refuses firmware older than the absolute minimum", async () => {
    const { client, respond, done } = await setup();
    respond.withRaw(
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: {
          case: "metadata",
          value: { firmwareVersion: "2.3.2.abc" },
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(10);
    await expect(done).rejects.toBeInstanceOf(FirmwareTooOldError);
    expect(client.device.firmwareSupport.value).toBe("tooOld");
  });

  it("does not take a remote node's metadata as this device's", async () => {
    const { client } = await setup();
    client.events.onDeviceMetadataPacket.dispatch({
      id: 1,
      from: 0x99,
      to: 0,
      type: "direct",
      channel: 0,
      rxTime: new Date(),
      data: create(Protobuf.Mesh.DeviceMetadataSchema, {
        firmwareVersion: "2.3.2",
      }),
    });
    expect(client.device.metadata.value).toBeUndefined();
    expect(client.device.firmwareSupport.value).toBe("unknown");
  });
});
