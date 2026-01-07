import { NodeError } from "@data/errors";
import { nodeRepo } from "@data/repositories";
import type { Node, PositionLog, TelemetryLog } from "@data/schema";
import { ResultAsync } from "neverthrow";
import { useEffect, useMemo, useState } from "react";
import { useDrizzleQuery } from "./useDrizzleLive.ts";

/**
 * Hook to fetch all nodes for a device
 */
export function useNodes(deviceId: number) {
  const { data } = useDrizzleQuery<Node>(
    () => nodeRepo.buildNodesQuery(deviceId),
    [deviceId],
  );

  const nodeMap = useMemo(
    () => new Map(data.map((node) => [node.nodeNum, node])),
    [data],
  );

  return {
    nodes: data,
    nodeMap,
  };
}

/**
 * Hook to fetch a specific node
 * Derives from useNodes for consistency
 */
export function useNode(deviceId: number, nodeNum: number) {
  const { nodes } = useNodes(deviceId);
  const node = useMemo(
    () => nodes.find((n) => n.nodeNum === nodeNum),
    [nodes, nodeNum],
  );

  return { node };
}

/**
 * Hook to fetch favorite nodes
 * Derives from useNodes for consistency
 */
export function useFavoriteNodes(deviceId: number) {
  const { nodes: allNodes } = useNodes(deviceId);
  const nodes = useMemo(() => allNodes.filter((n) => n.isFavorite), [allNodes]);

  return { nodes };
}

/**
 * Hook to fetch online nodes (heard within last 15 minutes)
 */
export function useOnlineNodes(deviceId: number) {
  const { data } = useDrizzleQuery<Node>(
    () => nodeRepo.buildOnlineNodesQuery(deviceId),
    [deviceId],
  );

  const onlineNodeIds = useMemo(
    () => new Set(data.map((n) => n.nodeNum)),
    [data],
  );

  return { nodes: data, onlineNodeIds };
}

/**
 * Hook to get the count of online nodes
 * Derives count from useOnlineNodes to avoid count(*) query issues with useReactiveQuery
 */
export function useOnlineCount(deviceId: number) {
  const { nodes } = useOnlineNodes(deviceId);
  return {
    count: nodes.length,
  };
}

/**
 * Hook to fetch position history for a node
 */
export function usePositionHistory(
  deviceId: number,
  nodeNum: number,
  since?: number,
  limit = 100,
) {
  const { data, isLoading } = useDrizzleQuery<PositionLog>(
    () => nodeRepo.buildPositionHistoryQuery(deviceId, nodeNum, since, limit),
    [deviceId, nodeNum, since, limit],
  );

  return {
    positions: data,
    isLoading,
  };
}

/**
 * Hook to fetch telemetry history for a node
 */
export function useTelemetryHistory(
  deviceId: number,
  nodeNum: number,
  since?: number,
  limit = 100,
) {
  const { data, isLoading } = useDrizzleQuery<TelemetryLog>(
    () => nodeRepo.buildTelemetryHistoryQuery(deviceId, nodeNum, since, limit),
    [deviceId, nodeNum, since, limit],
  );

  return {
    telemetry: data,
    isLoading,
  };
}

/**
 * Hook to fetch position history for multiple nodes at once
 * Note: This hook is not reactive and requires manual refresh
 */
export function usePositionTrails(
  deviceId: number,
  nodeNums: number[],
  since?: number,
  limitPerNode = 100,
) {
  const [trails, setTrails] = useState<Map<number, PositionLog[]>>(new Map());

  const stableNodeNums = useMemo(() => nodeNums, [nodeNums]);

  useEffect(() => {
    if (stableNodeNums.length === 0) {
      setTrails(new Map());
      return;
    }

    ResultAsync.fromPromise(
      nodeRepo.getPositionHistoryForNodes(
        deviceId,
        stableNodeNums,
        since,
        limitPerNode,
      ),
      (cause) => NodeError.getPositionHistoryForNodes(deviceId, cause),
    ).then((result) => {
      if (result.isOk()) {
        setTrails(result.value);
      }
    });
  }, [deviceId, stableNodeNums, since, limitPerNode]);

  return { trails };
}
