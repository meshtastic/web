import type * as Protobuf from "@meshtastic/protobufs";
import type { Node } from "../domain/Node.ts";

export const NodeMapper = {
  fromProto(info: Protobuf.Mesh.NodeInfo): Node {
    return {
      num: info.num,
      user: info.user,
      position: info.position,
      deviceMetrics: info.deviceMetrics,
      lastHeard: info.lastHeard,
      snr: info.snr,
      isFavorite: info.isFavorite,
      isIgnored: info.isIgnored,
    };
  },
};
