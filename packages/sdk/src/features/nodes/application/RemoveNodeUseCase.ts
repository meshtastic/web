import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { sendAdminMessage } from "../../device/infrastructure/AdminMessageSender.ts";

export async function removeNodeByNum(
  client: MeshClient,
  nodeNum: number,
): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "removeByNodenum", value: nodeNum });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function resetNodes(client: MeshClient): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "nodedbReset", value: true });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}
