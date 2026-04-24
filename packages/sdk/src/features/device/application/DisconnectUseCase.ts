import type { MeshClient } from "../../../core/client/MeshClient.ts";

export async function disconnect(client: MeshClient): Promise<void> {
  await client.disconnect();
}
