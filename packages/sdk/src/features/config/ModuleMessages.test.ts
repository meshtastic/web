import { create, fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { Result } from "better-result";
import { describe, expect, it, vi } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { DeviceStatusEnum } from "../../core/transport/Transport.ts";
import {
  CANNED_MESSAGES_MAX_BYTES,
  RINGTONE_MAX_BYTES,
  requestCannedMessages,
  requestRingtone,
  setCannedMessages,
  setRingtone,
} from "./application/ModuleMessagesUseCases.ts";

function makeClient() {
  const { transport } = createFakeTransport();
  const client = new MeshClient({ transport });
  const sendPacket = vi.spyOn(client, "sendPacket").mockResolvedValue(42);
  const sentAdmin = () =>
    sendPacket.mock.calls.map((call) =>
      fromBinary(Protobuf.Admin.AdminMessageSchema, call[0] as Uint8Array),
    );
  return { client, sendPacket, sentAdmin };
}

function adminPacket(
  from: number,
  payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
) {
  return {
    id: 1,
    rxTime: new Date(),
    type: "direct" as const,
    from,
    to: from,
    channel: 0,
    data: create(Protobuf.Admin.AdminMessageSchema, { payloadVariant }),
  };
}

function admin(payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"]) {
  return create(Protobuf.Admin.AdminMessageSchema, { payloadVariant });
}

describe("module message use-cases", () => {
  it("requests the canned messages and the ringtone", async () => {
    const { client, sentAdmin } = makeClient();
    expect(Result.isOk(await requestCannedMessages(client))).toBe(true);
    expect(Result.isOk(await requestRingtone(client))).toBe(true);
    expect(sentAdmin().map((m) => m.payloadVariant)).toEqual([
      { case: "getCannedMessageModuleMessagesRequest", value: true },
      { case: "getRingtoneRequest", value: true },
    ]);
  });

  it("sets the canned messages and the ringtone", async () => {
    const { client, sentAdmin } = makeClient();
    const result = await setCannedMessages(client, "Hi|Bye");
    expect(Result.isOk(result) && result.value).toBe(42);
    await setRingtone(client, "a:d=8,o=5,b=100:c");
    expect(sentAdmin().map((m) => m.payloadVariant)).toEqual([
      { case: "setCannedMessageModuleMessages", value: "Hi|Bye" },
      { case: "setRingtoneMessage", value: "a:d=8,o=5,b=100:c" },
    ]);
  });

  it("rejects values over the firmware byte limits without sending", async () => {
    const { client, sendPacket } = makeClient();
    const messages = await setCannedMessages(
      client,
      "é".repeat(CANNED_MESSAGES_MAX_BYTES / 2 + 1),
    );
    const ringtone = await setRingtone(
      client,
      "a".repeat(RINGTONE_MAX_BYTES + 1),
    );
    expect(Result.isError(messages)).toBe(true);
    expect(Result.isError(ringtone)).toBe(true);
    expect(sendPacket).not.toHaveBeenCalled();
  });

  it("returns an error when the send fails", async () => {
    const { client, sendPacket } = makeClient();
    sendPacket.mockRejectedValueOnce(new Error("offline"));
    const result = await requestRingtone(client);
    expect(Result.isError(result) && result.error.message).toBe("offline");
  });
});

describe("ConfigClient canned messages and ringtone", () => {
  it("stays undefined until the local node answers", () => {
    const { client } = makeClient();
    expect(client.config.cannedMessages.value).toBeUndefined();
    expect(client.config.ringtone.value).toBeUndefined();

    client.events.onAdminPacket.dispatch(
      adminPacket(client.myNodeNum, {
        case: "getCannedMessageModuleMessagesResponse",
        value: "Yes|No",
      }),
    );
    client.events.onAdminPacket.dispatch(
      adminPacket(client.myNodeNum, {
        case: "getRingtoneResponse",
        value: "tone:d=4:c",
      }),
    );
    expect(client.config.cannedMessages.value).toBe("Yes|No");
    expect(client.config.ringtone.value).toBe("tone:d=4:c");
  });

  it("ignores answers from other nodes", () => {
    const { client } = makeClient();
    client.events.onAdminPacket.dispatch(
      adminPacket(client.myNodeNum + 1, {
        case: "getRingtoneResponse",
        value: "remote",
      }),
    );
    expect(client.config.ringtone.value).toBeUndefined();
  });

  it("forgets both on disconnect", () => {
    const { client } = makeClient();
    client.events.onAdminPacket.dispatch(
      adminPacket(client.myNodeNum, {
        case: "getRingtoneResponse",
        value: "tone",
      }),
    );
    client.events.onDeviceStatus.dispatch(DeviceStatusEnum.DeviceDisconnected);
    expect(client.config.ringtone.value).toBeUndefined();
  });

  it("caches a value it set", async () => {
    const { client } = makeClient();
    await client.config.setCannedMessages("A|B");
    await client.config.setRingtone("r");
    expect(client.config.cannedMessages.value).toBe("A|B");
    expect(client.config.ringtone.value).toBe("r");
  });
});

describe("ConfigEditor.stageAdminMessage", () => {
  it("keeps one message per key and marks the editor dirty", () => {
    const { client } = makeClient();
    const editor = client.config.editor;
    editor.stageAdminMessage(
      "cannedMessages",
      admin({ case: "setCannedMessageModuleMessages", value: "a" }),
    );
    editor.stageAdminMessage(
      "cannedMessages",
      admin({ case: "setCannedMessageModuleMessages", value: "ab" }),
    );
    expect(editor.stagedAdminMessages.value.size).toBe(1);
    expect(
      editor.stagedAdminMessages.value.get("cannedMessages")?.payloadVariant
        .value,
    ).toBe("ab");
    expect(editor.isDirty.value).toBe(true);

    editor.stageAdminMessage("cannedMessages", undefined);
    expect(editor.stagedAdminMessages.value.size).toBe(0);
    expect(editor.isDirty.value).toBe(false);
  });

  it("drops staged messages on reset and disconnect", () => {
    const { client } = makeClient();
    const editor = client.config.editor;
    const ringtone = admin({ case: "setRingtoneMessage", value: "r" });

    editor.stageAdminMessage("ringtone", ringtone);
    editor.reset();
    expect(editor.stagedAdminMessages.value.size).toBe(0);
    expect(editor.isDirty.value).toBe(false);

    editor.stageAdminMessage("ringtone", ringtone);
    client.events.onDeviceStatus.dispatch(DeviceStatusEnum.DeviceDisconnected);
    expect(editor.stagedAdminMessages.value.size).toBe(0);
  });

  it("sends staged messages inside the edit and caches them on commit", async () => {
    const { client, sentAdmin } = makeClient();
    const editor = client.config.editor;
    editor.stageAdminMessage(
      "cannedMessages",
      admin({ case: "setCannedMessageModuleMessages", value: "Hi|Bye" }),
    );
    editor.stageAdminMessage(
      "ringtone",
      admin({ case: "setRingtoneMessage", value: "tone" }),
    );

    const result = await editor.commit();
    expect(Result.isOk(result)).toBe(true);
    expect(sentAdmin().map((m) => m.payloadVariant.case)).toEqual([
      "beginEditSettings",
      "setCannedMessageModuleMessages",
      "setRingtoneMessage",
      "commitEditSettings",
    ]);
    expect(editor.stagedAdminMessages.value.size).toBe(0);
    expect(editor.isDirty.value).toBe(false);
    expect(client.config.cannedMessages.value).toBe("Hi|Bye");
    expect(client.config.ringtone.value).toBe("tone");
  });

  it("keeps staged messages when the commit fails", async () => {
    const { client, sendPacket } = makeClient();
    const editor = client.config.editor;
    editor.stageAdminMessage(
      "ringtone",
      admin({ case: "setRingtoneMessage", value: "tone" }),
    );
    sendPacket
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error("no ack"));

    const result = await editor.commit();
    expect(Result.isError(result)).toBe(true);
    expect(editor.stagedAdminMessages.value.size).toBe(1);
    expect(client.config.ringtone.value).toBeUndefined();
  });
});
