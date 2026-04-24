import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";

export async function runTraceRoute(
  client: MeshClient,
  destination: number,
): Promise<ResultType<number, Error>> {
  try {
    const routeDiscovery = create(Protobuf.Mesh.RouteDiscoverySchema, { route: [] });
    const id = await client.sendPacket(
      toBinary(Protobuf.Mesh.RouteDiscoverySchema, routeDiscovery),
      Protobuf.Portnums.PortNum.TRACEROUTE_APP,
      destination,
    );
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}
