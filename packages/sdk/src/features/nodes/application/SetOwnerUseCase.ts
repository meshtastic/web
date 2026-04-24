import type * as Protobuf from "@meshtastic/protobufs";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { sendAdminMessage } from "../../device/infrastructure/AdminMessageSender.ts";

export async function setOwner(
  client: MeshClient,
  owner: Protobuf.Mesh.User,
): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "setOwner", value: owner });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}
