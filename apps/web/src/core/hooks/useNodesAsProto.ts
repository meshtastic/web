import { create } from "@bufbuild/protobuf";
import type { Node as SdkNode } from "@meshtastic/sdk";
import { Protobuf } from "@meshtastic/sdk";
import { useActiveClient, useSignal } from "@meshtastic/sdk-react";
import { useMemo } from "react";

/**
 * Adapter hooks that surface SDK-managed nodes in the
 * `Protobuf.Mesh.NodeInfo` shape consumed by web components today.
 *
 * Wraps the SDK Node into the legacy proto shape so the existing
 * components keep working without rewrites. Removed once every consumer
 * reads `Node` from the SDK directly.
 *
 * Reads through `useActiveClient()` so that, when no client is active
 * (e.g. inside isolated component tests or before any device connects),
 * the hooks return safe empty values instead of throwing.
 */

const EMPTY_NODES: ReadonlyArray<SdkNode> = [];

function useSdkNodesSafe(): ReadonlyArray<SdkNode> {
  const client = useActiveClient();
  // Always pass *something* to useSignal so the hook count stays stable
  // across the with-client / without-client branches.
  return useSignal(
    client?.nodes.list ?? {
      value: EMPTY_NODES,
      peek: () => EMPTY_NODES,
      subscribe: () => () => {},
    },
  );
}

function useMyNodeNumSafe(): number | undefined {
  const client = useActiveClient();
  return useSignal(
    client?.device.myNodeNum ?? {
      value: undefined,
      peek: () => undefined,
      subscribe: () => () => {},
    },
  );
}

export function useNodesAsProto(): Protobuf.Mesh.NodeInfo[] {
  const nodes = useSdkNodesSafe();
  return useMemo(() => nodes.map(toNodeInfo), [nodes]);
}

export function useNodeAsProto(nodeNum: number): Protobuf.Mesh.NodeInfo | undefined {
  const nodes = useSdkNodesSafe();
  return useMemo(() => {
    const found = nodes.find((n) => n.num === nodeNum);
    return found ? toNodeInfo(found) : undefined;
  }, [nodes, nodeNum]);
}

/**
 * "My node" — the node info for the locally-connected device, if its
 * NodeInfo packet has been observed yet. Returns undefined while the
 * device is still configuring or there is no active client.
 */
export function useMyNodeAsProto(): Protobuf.Mesh.NodeInfo | undefined {
  const myNodeNum = useMyNodeNumSafe();
  const nodes = useSdkNodesSafe();
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
