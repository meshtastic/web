import { Protobuf } from "@core/protobuf.ts";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  adminMessage,
  editSettings,
  getConfig,
  getText,
  sendAdmin,
} from "./admin.ts";
import { adminFailed, adminOk, FakeKmpClient } from "./fakeClient.ts";

function decodeSent(bytes: Uint8Array): Protobuf.Admin.AdminMessage {
  return fromBinary(Protobuf.Admin.AdminMessageSchema, bytes);
}

describe("sendAdmin", () => {
  it("encodes the variant and sends it to the local node", async () => {
    const client = new FakeKmpClient();
    const result = await sendAdmin(client, {
      case: "rebootSeconds",
      value: 5,
    });
    expect(Result.isOk(result)).toBe(true);
    const admin = client.admin();
    expect(admin.sent.map((m) => decodeSent(m).payloadVariant)).toEqual([
      { case: "rebootSeconds", value: 5 },
    ]);
  });

  it("targets a remote node when dest is given", async () => {
    const client = new FakeKmpClient();
    await sendAdmin(client, { case: "shutdownSeconds", value: 1 }, 0x1234);
    expect(client.admin(0x1234).sent).toHaveLength(1);
    expect(client.admins.has(0)).toBe(false);
  });

  it("hands a node number above 0x7fffffff to the SDK signed", async () => {
    const client = new FakeKmpClient();
    await sendAdmin(
      client,
      { case: "getDeviceMetadataRequest", value: true },
      0xdeadbeef,
    );
    expect([...client.admins.keys()]).toEqual([0xdeadbeef | 0]);
  });

  it("maps a failed result to an error carrying the reason", async () => {
    const client = new FakeKmpClient();
    client.admin().results.push(adminFailed("timeout"));
    const result = await sendAdmin(client, {
      case: "nodedbReset",
      value: true,
    });
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error.message).toContain("timeout");
    }
  });
});

describe("getConfig", () => {
  it("decodes the returned Config", async () => {
    const client = new FakeKmpClient();
    const config = create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "lora",
        value: { region: Protobuf.Config.Config_LoRaConfig_RegionCode.EU_868 },
      },
    });
    client
      .admin()
      .results.push(adminOk(toBinary(Protobuf.Config.ConfigSchema, config)));
    const result = await getConfig(
      client,
      Protobuf.Admin.AdminMessage_ConfigType.LORA_CONFIG,
    );
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.payloadVariant.case).toBe("lora");
    }
  });

  it("fails on an empty response", async () => {
    const client = new FakeKmpClient();
    client.admin().results.push(adminOk());
    const result = await getConfig(
      client,
      Protobuf.Admin.AdminMessage_ConfigType.LORA_CONFIG,
    );
    expect(Result.isError(result)).toBe(true);
  });
});

describe("getText", () => {
  it("returns the text answer", async () => {
    const client = new FakeKmpClient();
    client.admin().results.push(adminOk(undefined, "a|b|c"));
    const result = await getText(client, {
      case: "getCannedMessageModuleMessagesRequest",
      value: true,
    });
    expect(result).toEqual(Result.ok("a|b|c"));
  });
});

describe("editSettings", () => {
  it("sends every message in one transaction", async () => {
    const client = new FakeKmpClient();
    const messages = [
      adminMessage({ case: "beginEditSettings", value: true }),
      adminMessage({
        case: "setOwner",
        value: create(Protobuf.Mesh.UserSchema, { longName: "Alice" }),
      }),
    ];
    const result = await editSettings(client, messages);
    expect(Result.isOk(result)).toBe(true);
    expect(
      client
        .admin()
        .transactions.map((t) =>
          t.map((m) => decodeSent(m).payloadVariant.case),
        ),
    ).toEqual([["beginEditSettings", "setOwner"]]);
  });
});
