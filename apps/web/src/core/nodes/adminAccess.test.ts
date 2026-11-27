import { sendAdmin } from "@core/kmp/admin.ts";
import { adminFailed, adminOk, FakeKmpClient } from "@core/kmp/fakeClient.ts";
import { Protobuf } from "@core/protobuf.ts";
import { fromBinary } from "@bufbuild/protobuf";
import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_ACCESS_TIMEOUT_MS,
  type AdminAccessDeps,
  canCheckAdminAccess,
  checkAdminAccess,
  rememberedAdminAccess,
} from "./adminAccess.ts";

const NODE = 0x0c40;

function setup() {
  const client = new FakeKmpClient();
  const setAdminAccess = vi.fn();
  const deps: AdminAccessDeps = {
    sendAdmin: (variant, dest) => sendAdmin(client, variant, dest),
    setAdminAccess,
  };
  return { client, deps, setAdminAccess };
}

describe("checkAdminAccess", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends one device metadata request to the node", async () => {
    const { client, deps } = setup();
    await checkAdminAccess(deps, NODE);
    const sent = client.admin(NODE).sent;
    expect(sent).toHaveLength(1);
    expect(
      fromBinary(Protobuf.Admin.AdminMessageSchema, sent[0]!).payloadVariant,
    ).toEqual({ case: "getDeviceMetadataRequest", value: true });
  });

  it("remembers a node that answers", async () => {
    const { client, deps, setAdminAccess } = setup();
    client.admin(NODE).results.push(adminOk(new Uint8Array()));
    const result = await checkAdminAccess(deps, NODE);
    expect(result).toEqual(Result.ok("authorized"));
    expect(setAdminAccess).toHaveBeenCalledWith(NODE, true);
  });

  it("forgets a node that refuses this radio's key", async () => {
    const { client, deps, setAdminAccess } = setup();
    // The SDK folds NOT_AUTHORIZED and ADMIN_PUBLIC_KEY_UNAUTHORIZED into this.
    client.admin(NODE).results.push(adminFailed("unauthorized"));
    const result = await checkAdminAccess(deps, NODE);
    expect(result).toEqual(Result.ok("unauthorized"));
    expect(setAdminAccess).toHaveBeenCalledWith(NODE, false);
  });

  it.each([
    "timeout",
    "node-unreachable",
    "MAX_RETRANSMIT",
    "NO_RESPONSE",
    "NO_ROUTE",
  ])("calls %s unreachable and leaves the memory alone", async (reason) => {
    const { client, deps, setAdminAccess } = setup();
    client.admin(NODE).results.push(adminFailed(reason));
    const result = await checkAdminAccess(deps, NODE);
    expect(result).toEqual(Result.ok("unreachable"));
    expect(setAdminAccess).not.toHaveBeenCalled();
  });

  it("gives up after 30 seconds without an answer", async () => {
    vi.useFakeTimers();
    const setAdminAccess = vi.fn();
    const pending = checkAdminAccess(
      { sendAdmin: () => new Promise(() => {}), setAdminAccess },
      NODE,
    );
    await vi.advanceTimersByTimeAsync(ADMIN_ACCESS_TIMEOUT_MS - 1);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual(Result.ok("unreachable"));
    expect(setAdminAccess).not.toHaveBeenCalled();
  });

  it.each(["rate-limited", "PKI_UNKNOWN_PUBKEY"])(
    "reports %s as an error",
    async (reason) => {
      const { client, deps, setAdminAccess } = setup();
      client.admin(NODE).results.push(adminFailed(reason));
      const result = await checkAdminAccess(deps, NODE);
      expect(Result.isError(result)).toBe(true);
      expect(setAdminAccess).not.toHaveBeenCalled();
    },
  );

  it("reports a request that throws as an error", async () => {
    const result = await checkAdminAccess(
      {
        sendAdmin: () => Promise.reject(new Error("disconnected")),
        setAdminAccess: vi.fn(),
      },
      NODE,
    );
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error.message).toBe("disconnected");
    }
  });
});

describe("canCheckAdminAccess", () => {
  const key = new Uint8Array([1, 2, 3]);

  it("needs another node with a key, and a key on this radio", () => {
    expect(canCheckAdminAccess({ isSelf: false, publicKey: key }, key)).toBe(
      true,
    );
    expect(canCheckAdminAccess({ isSelf: true, publicKey: key }, key)).toBe(
      false,
    );
    expect(
      canCheckAdminAccess({ isSelf: false, publicKey: undefined }, key),
    ).toBe(false);
    expect(
      canCheckAdminAccess({ isSelf: false, publicKey: key }, undefined),
    ).toBe(false);
    expect(
      canCheckAdminAccess({ isSelf: false, publicKey: key }, new Uint8Array()),
    ).toBe(false);
  });
});

describe("rememberedAdminAccess", () => {
  const key = new Uint8Array([1, 2, 3]); // "AQID"

  it("holds only under the key it was learned with", () => {
    const device = { adminAccessNodes: [0x0c40], adminAccessKey: "AQID" };
    expect(rememberedAdminAccess(device, key)).toEqual([0x0c40]);
    expect(rememberedAdminAccess(device, new Uint8Array([4, 5, 6]))).toEqual(
      [],
    );
    expect(rememberedAdminAccess(device, undefined)).toEqual([]);
    expect(rememberedAdminAccess(device, new Uint8Array())).toEqual([]);
  });

  it("treats a list saved without a key as empty", () => {
    expect(rememberedAdminAccess({ adminAccessNodes: [0x0c40] }, key)).toEqual(
      [],
    );
  });
});
