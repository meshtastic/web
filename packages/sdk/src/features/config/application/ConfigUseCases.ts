import type * as Protobuf from "@meshtastic/protobufs";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { sendAdminMessage } from "../../device/infrastructure/AdminMessageSender.ts";

export async function beginEditSettings(client: MeshClient): Promise<ResultType<number, Error>> {
  client.events.onPendingSettingsChange.dispatch(true);
  try {
    const id = await sendAdminMessage(client, { case: "beginEditSettings", value: true });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function commitEditSettings(client: MeshClient): Promise<ResultType<number, Error>> {
  client.events.onPendingSettingsChange.dispatch(false);
  try {
    const id = await sendAdminMessage(client, { case: "commitEditSettings", value: true });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function setConfig(
  client: MeshClient,
  config: Protobuf.Config.Config,
): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "setConfig", value: config });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function getConfig(
  client: MeshClient,
  type: Protobuf.Admin.AdminMessage_ConfigType,
): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "getConfigRequest", value: type });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function setModuleConfig(
  client: MeshClient,
  moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "setModuleConfig", value: moduleConfig });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function getModuleConfig(
  client: MeshClient,
  type: Protobuf.Admin.AdminMessage_ModuleConfigType,
): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "getModuleConfigRequest", value: type });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}
