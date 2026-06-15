import type { MeshClient } from "../../../core/client/MeshClient.ts";

/**
 * Kicks off the wantConfigId handshake. The bulk of configuration state is
 * filled asynchronously as the device streams back FromRadio packets —
 * ConfigClient/NodesClient/ChannelsClient populate their stores from events.
 */
export async function configure(client: MeshClient): Promise<number> {
  return client.configure();
}
