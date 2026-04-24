import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { sendAdminMessage } from "../infrastructure/AdminMessageSender.ts";

export function shutdown(client: MeshClient, seconds: number): Promise<number> {
  return sendAdminMessage(client, { case: "shutdownSeconds", value: seconds });
}

export function reboot(client: MeshClient, seconds: number): Promise<number> {
  return sendAdminMessage(client, { case: "rebootSeconds", value: seconds });
}

export function rebootOta(client: MeshClient, seconds: number): Promise<number> {
  return sendAdminMessage(client, { case: "rebootOtaSeconds", value: seconds });
}

export function factoryResetDevice(client: MeshClient): Promise<number> {
  return sendAdminMessage(client, { case: "factoryResetDevice", value: 1 });
}

export function factoryResetConfig(client: MeshClient): Promise<number> {
  return sendAdminMessage(client, { case: "factoryResetConfig", value: 1 });
}

export function enterDfuMode(client: MeshClient): Promise<number> {
  return sendAdminMessage(client, { case: "enterDfuModeRequest", value: true });
}
