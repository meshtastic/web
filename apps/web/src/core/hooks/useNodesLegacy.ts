import { create } from "@bufbuild/protobuf";
import type { Node as SdkNode } from "@meshtastic/sdk";
import { Protobuf } from "@meshtastic/sdk";
import { useMeshDevice, useNodes } from "@meshtastic/sdk-react";
import { useMemo } from "react";

/**
 * Adapter hooks that surface SDK-managed nodes in the legacy
 * `Protobuf.Mesh.NodeInfo` shape consumed by web components today.
 *
 * Lets components migrate off the Zustand `useNodeDB().getNodes/getNode`
 * API one at a time without rewriting their templates. Removed once
 * every consumer reads `Node` from the SDK directly.
 */

export function useNodesAsProto(): Protobuf.Mesh.NodeInfo[] {
  const nodes = useNodes();
  return useMemo(() => nodes.map(toNodeInfo), [nodes]);
}

export function useNodeAsProto(nodeNum: number): Protobuf.Mesh.NodeInfo | undefined {
  const nodes = useNodes();
  return useMemo(() => {
    const found = nodes.find((n) => n.num === nodeNum);
    return found ? toNodeInfo(found) : undefined;
  }, [nodes, nodeNum]);
}

/**
 * "My node" — the node info for the locally-connected device, if its
 * NodeInfo packet has been observed yet. Returns undefined while the
 * device is still configuring.
 */
export function useMyNodeAsProto(): Protobuf.Mesh.NodeInfo | undefined {
  const { myNodeNum } = useMeshDevice();
  const nodes = useNodes();
  return useMemo(() => {
    if (myNodeNum === undefined) return undefined;
    const found = nodes.find((n) => n.num === myNodeNum);
    return found ? toNodeInfo(found) : undefined;
  }, [myNodeNum, nodes]);
}

function toNodeInfo(node: SdkNode): Protobuf.Mesh.NodeInfo {
  return create(Protobuf.Mesh.NodeInfoSchema, {
    num: node.num,
    user: node.user,
    position: node.position,
    deviceMetrics: node.deviceMetrics,
    snr: node.snr ?? 0,
    lastHeard: node.lastHeard ?? 0,
    channel: node.channel ?? 0,
    viaMqtt: node.viaMqtt ?? false,
    hopsAway: node.hopsAway,
    isFavorite: node.isFavorite,
    isIgnored: node.isIgnored,
    isKeyManuallyVerified: node.isKeyManuallyVerified ?? false,
  });
}
