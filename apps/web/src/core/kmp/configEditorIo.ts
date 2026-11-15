import { Protobuf, Types } from "@core/protobuf.ts";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { DeviceStatusEnum, type MeshClient } from "@meshtastic/sdk";
import type { MeshtasticClient } from "@meshtastic/sdk-kmp";
import { Result } from "better-result";
import { editSettings } from "./admin.ts";
import { ConfigEditor, type ConfigEditorIo } from "./configEditor.ts";
import { moduleMessagesFor } from "./moduleMessages.ts";

type AdminMessages = readonly Protobuf.Admin.AdminMessage[];

/** The editor's device access through the Kotlin SDK facade. */
export function facadeIo(client: MeshtasticClient): ConfigEditorIo {
  return {
    onConfig: (cb) =>
      client.onConfigBundle((bundle) => {
        for (const bytes of bundle?.configs ?? []) {
          cb(fromBinary(Protobuf.Config.ConfigSchema, bytes));
        }
      }),
    onModuleConfig: (cb) =>
      client.onConfigBundle((bundle) => {
        for (const bytes of bundle?.moduleConfigs ?? []) {
          cb(fromBinary(Protobuf.ModuleConfig.ModuleConfigSchema, bytes));
        }
      }),
    onChannel: (cb) =>
      client.onChannels((channels) => {
        for (const bytes of channels ?? []) {
          cb(fromBinary(Protobuf.Channel.ChannelSchema, bytes));
        }
      }),
    onDisconnect: (cb) =>
      client.onConnectionState((state) => {
        if (state.kind === "disconnected") cb();
      }),
    commit: (messages) => editSettings(client, messages),
  };
}

/**
 * The editor's device access through the TypeScript SDK client, for the
 * Serial and Bluetooth connections it still carries.
 */
export function meshClientIo(client: MeshClient): ConfigEditorIo {
  return {
    onConfig: (cb) => client.events.onConfigPacket.subscribe(cb),
    onModuleConfig: (cb) => client.events.onModuleConfigPacket.subscribe(cb),
    onChannel: (cb) => client.events.onChannelPacket.subscribe(cb),
    onDisconnect: (cb) =>
      client.events.onDeviceStatus.subscribe((status) => {
        if (status === DeviceStatusEnum.DeviceDisconnected) cb();
      }),
    commit: (messages) => commitThroughMeshClient(client, messages),
  };
}

async function commitThroughMeshClient(
  client: MeshClient,
  messages: AdminMessages,
): Promise<Result<void, Error>> {
  let disconnected = false;
  const off = client.events.onDeviceStatus.subscribe((status) => {
    if (status === DeviceStatusEnum.DeviceDisconnected) disconnected = true;
  });
  client.events.onPendingSettingsChange.dispatch(true);
  try {
    const begin = await sendAdmin(client, {
      case: "beginEditSettings",
      value: true,
    });
    if (Result.isError(begin)) return begin;
    for (const message of messages) {
      const sent = await sendAdmin(client, message.payloadVariant);
      if (Result.isError(sent)) {
        // There is no abort message. Close the transaction rather than
        // leave it open; the editor keeps everything dirty for a resend.
        if (!disconnected) {
          await sendAdmin(client, { case: "commitEditSettings", value: true });
        }
        return sent;
      }
    }
    return sendAdmin(client, { case: "commitEditSettings", value: true });
  } finally {
    off();
    client.events.onPendingSettingsChange.dispatch(false);
  }
}

function isBadSessionKey(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "error" in e &&
    e.error === Protobuf.Mesh.Routing_Error.ADMIN_BAD_SESSION_KEY
  );
}

/**
 * Sends an admin message to the local node, stamped with its session
 * passkey; on `ADMIN_BAD_SESSION_KEY` asks for a fresh one and retries once.
 */
async function sendAdmin(
  client: MeshClient,
  payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
): Promise<Result<void, Error>> {
  const nodeNum = client.myNodeNum;
  const send = () =>
    client.sendPacket(
      toBinary(
        Protobuf.Admin.AdminMessageSchema,
        create(Protobuf.Admin.AdminMessageSchema, {
          payloadVariant,
          sessionPasskey: client.device.session.get(nodeNum),
        }),
      ),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      "self",
      Types.ChannelNumber.Primary,
      true,
      true,
    );
  try {
    await send();
    return Result.ok(undefined);
  } catch (e) {
    if (!isBadSessionKey(e)) return Result.err(toError(e));
    client.device.session.forget(nodeNum);
    const arrived = client.device.session.waitFor(nodeNum);
    client
      .sendPacket(
        toBinary(
          Protobuf.Admin.AdminMessageSchema,
          create(Protobuf.Admin.AdminMessageSchema, {
            payloadVariant: { case: "getOwnerRequest", value: true },
          }),
        ),
        Protobuf.Portnums.PortNum.ADMIN_APP,
        nodeNum,
        Types.ChannelNumber.Primary,
      )
      .catch(() => undefined);
    if (!(await arrived)) return Result.err(toError(e));
    try {
      await send();
      return Result.ok(undefined);
    } catch (retry) {
      return Result.err(toError(retry));
    }
  }
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

const editors = new WeakMap<MeshClient, ConfigEditor>();

/** The one editor for a TypeScript SDK client, created on first use. */
export function editorFor(client: MeshClient): ConfigEditor {
  const existing = editors.get(client);
  if (existing) return existing;
  const messages = moduleMessagesFor(client);
  const editor = new ConfigEditor(meshClientIo(client), {
    onStagedAdminMessageCommitted: (message) => messages.applySent(message),
  });
  editors.set(client, editor);
  return editor;
}
