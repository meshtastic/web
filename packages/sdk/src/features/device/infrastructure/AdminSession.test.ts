import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeshClient } from "../../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../../core/testing/createFakeTransport.ts";
import { sendAdminMessage } from "./AdminMessageSender.ts";
import { SESSION_PASSKEY_TTL_MS } from "./AdminSession.ts";

const REMOTE = 0x42;
const KEY = new Uint8Array([9, 8, 7, 6]);

function setup() {
  const fake = createFakeTransport();
  const client = new MeshClient({
    transport: fake.transport,
    heartbeatIntervalMs: false,
  });
  return { ...fake, client };
}

function adminFrom(
  from: number,
  payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
  sessionPasskey = KEY,
) {
  return create(Protobuf.Mesh.MeshPacketSchema, {
    from,
    to: 1,
    id: Math.floor(Math.random() * 1e9) + 1,
    payloadVariant: {
      case: "decoded",
      value: {
        portnum: Protobuf.Portnums.PortNum.ADMIN_APP,
        payload: toBinary(
          Protobuf.Admin.AdminMessageSchema,
          create(Protobuf.Admin.AdminMessageSchema, {
            payloadVariant,
            sessionPasskey,
          }),
        ),
      },
    },
  });
}

function sentAdmin(sent: Uint8Array[]) {
  return sent.flatMap((bytes) => {
    const toRadio = fromBinary(Protobuf.Mesh.ToRadioSchema, bytes);
    if (toRadio.payloadVariant.case !== "packet") return [];
    const packet = toRadio.payloadVariant.value;
    if (packet.payloadVariant.case !== "decoded") return [];
    const data = packet.payloadVariant.value;
    if (data.portnum !== Protobuf.Portnums.PortNum.ADMIN_APP) return [];
    return [
      {
        to: packet.to,
        id: packet.id,
        admin: fromBinary(Protobuf.Admin.AdminMessageSchema, data.payload),
      },
    ];
  });
}

describe("AdminSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("caches the passkey from a node's admin response and stamps it", async () => {
    const { client, respond, sent } = setup();
    respond.withMeshPacket(
      adminFrom(REMOTE, {
        case: "getDeviceMetadataResponse",
        value: create(Protobuf.Mesh.DeviceMetadataSchema),
      }),
    );
    await vi.advanceTimersByTimeAsync(10);
    expect(client.device.session.get(REMOTE)).toEqual(KEY);

    sendAdminMessage(client, { case: "rebootSeconds", value: 5 }, REMOTE).catch(
      () => {},
    );
    await vi.advanceTimersByTimeAsync(500);
    const [reboot] = sentAdmin(sent);
    expect(reboot?.to).toBe(REMOTE);
    expect(reboot?.admin.sessionPasskey).toEqual(KEY);
  });

  it("forgets a passkey after the TTL", async () => {
    const { client, respond } = setup();
    respond.withMeshPacket(
      adminFrom(REMOTE, {
        case: "getDeviceMetadataResponse",
        value: create(Protobuf.Mesh.DeviceMetadataSchema),
      }),
    );
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(SESSION_PASSKEY_TTL_MS + 1);
    expect(client.device.session.get(REMOTE)).toBeUndefined();
  });

  it("ignores admin messages without a passkey", async () => {
    const { client, respond } = setup();
    respond.withMeshPacket(
      adminFrom(
        REMOTE,
        {
          case: "getDeviceMetadataResponse",
          value: create(Protobuf.Mesh.DeviceMetadataSchema),
        },
        new Uint8Array(),
      ),
    );
    await vi.advanceTimersByTimeAsync(10);
    expect(client.device.session.get(REMOTE)).toBeUndefined();
  });

  it("re-seeds and retries once on ADMIN_BAD_SESSION_KEY", async () => {
    const { client, respond, sent } = setup();
    const result = sendAdminMessage(
      client,
      { case: "rebootSeconds", value: 5 },
      REMOTE,
    );
    result.catch(() => {});
    await vi.advanceTimersByTimeAsync(500);
    const [first] = sentAdmin(sent);
    expect(first?.admin.sessionPasskey).toHaveLength(0);

    client.queue.processError({
      id: first!.id,
      error: Protobuf.Mesh.Routing_Error.ADMIN_BAD_SESSION_KEY,
    });
    await vi.advanceTimersByTimeAsync(500);
    const seed = sentAdmin(sent)[1];
    expect(seed?.admin.payloadVariant.case).toBe("getDeviceMetadataRequest");

    respond.withMeshPacket(
      adminFrom(REMOTE, {
        case: "getDeviceMetadataResponse",
        value: create(Protobuf.Mesh.DeviceMetadataSchema),
      }),
    );
    await vi.advanceTimersByTimeAsync(500);
    const retry = sentAdmin(sent)[2];
    expect(retry?.admin.payloadVariant.case).toBe("rebootSeconds");
    expect(retry?.admin.sessionPasskey).toEqual(KEY);

    client.queue.processAck(retry!.id);
    await expect(result).resolves.toBe(retry!.id);
  });
});
