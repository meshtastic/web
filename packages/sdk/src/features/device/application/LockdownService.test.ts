import { create, fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeshClient } from "../../../core/client/MeshClient.ts";
import { CONFIG_NONCE, NODEDB_NONCE } from "../../../core/client/handshake.ts";
import { createFakeTransport } from "../../../core/testing/createFakeTransport.ts";

const State = Protobuf.Mesh.LockdownStatus_State;

function decode(sent: Uint8Array[]) {
  return sent.map((b) => fromBinary(Protobuf.Mesh.ToRadioSchema, b));
}

function adminSent(sent: Uint8Array[]) {
  return decode(sent).flatMap((m) => {
    if (m.payloadVariant.case !== "packet") return [];
    const d = m.payloadVariant.value.payloadVariant;
    if (d.case !== "decoded") return [];
    return [fromBinary(Protobuf.Admin.AdminMessageSchema, d.value.payload)];
  });
}

describe("lockdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function connectLocked() {
    const fake = createFakeTransport();
    const client = new MeshClient({
      transport: fake.transport,
      heartbeatIntervalMs: false,
    });
    client.configure().catch(() => {});
    await vi.advanceTimersByTimeAsync(300);
    fake.respond.withMyNodeInfo({ myNodeNum: 0x1234 });
    fake.respond.withConfigCompleteId(CONFIG_NONCE);
    fake.respond.withRaw(
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: {
          case: "lockdownStatus",
          value: { state: State.LOCKED },
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(1_000);
    fake.respond.withConfigCompleteId(NODEDB_NONCE);
    await vi.advanceTimersByTimeAsync(500);
    return { ...fake, client };
  }

  it("reports a locked device and skips the session seed", async () => {
    const { client, sent } = await connectLocked();
    expect(client.device.isLocked.value).toBe(true);
    expect(
      adminSent(sent).some((a) => a.payloadVariant.case === "getOwnerRequest"),
    ).toBe(false);
  });

  it("sends the passphrase and re-runs the handshake once unlocked", async () => {
    const { client, respond, sent } = await connectLocked();
    client.device.unlock({ passphrase: "hunter2" }).catch(() => {});
    await vi.advanceTimersByTimeAsync(500);

    const auth = adminSent(sent).find(
      (a) => a.payloadVariant.case === "lockdownAuth",
    );
    if (auth?.payloadVariant.case !== "lockdownAuth") throw new Error("none");
    expect(new TextDecoder().decode(auth.payloadVariant.value.passphrase)).toBe(
      "hunter2",
    );
    expect(auth.payloadVariant.value.bootsRemaining).toBe(50);

    const before = decode(sent).filter(
      (m) => m.payloadVariant.case === "wantConfigId",
    ).length;
    respond.withRaw(
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: {
          case: "lockdownStatus",
          value: { state: State.UNLOCKED },
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(500);
    const wantConfigs = decode(sent).filter(
      (m) => m.payloadVariant.case === "wantConfigId",
    );
    expect(wantConfigs.length).toBe(before + 1);
    expect(wantConfigs.at(-1)?.payloadVariant.value).toBe(CONFIG_NONCE);
    expect(client.device.isLocked.value).toBe(false);
  });

  it("does not re-run the handshake for an UNLOCKED it didn't ask for", async () => {
    const fake = createFakeTransport();
    const client = new MeshClient({
      transport: fake.transport,
      heartbeatIntervalMs: false,
    });
    fake.respond.withRaw(
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: {
          case: "lockdownStatus",
          value: { state: State.UNLOCKED },
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(500);
    expect(fake.sent).toHaveLength(0);
    expect(client.device.isLocked.value).toBe(false);
  });
});
