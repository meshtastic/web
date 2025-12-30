import { NodeError } from "@data/errors";
import { nodes, positionLogs, telemetryLogs } from "@data/schema";
import type { Node, PositionLog, TelemetryLog } from "@data/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import type { Result } from "neverthrow";
import { okAsync, ResultAsync } from "neverthrow";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { getClient, getDb } from "../../../data/client.ts";
import { nodeRepo } from "@data/repositories";

/**
 * Hook to fetch all nodes for a device
 * Now reactive using sqlocal
 */
export function useNodes(deviceId: number) {
  const query = useMemo(
    () => getDb().select().from(nodes).where(eq(nodes.ownerNodeNum, deviceId)),
    [deviceId],
  );

  const { data } = useReactiveQuery(getClient(), query);

  const nodeMap = useMemo(
    () => new Map((data ?? []).map((node) => [node.nodeNum, node])),
    [data],
  );

  const refresh = useCallback(async (): Promise<Result<Node[], NodeError>> => {
    // No-op, just return current data
    return okAsync(data ?? []);
  }, [data]);

  return {
    nodes: data ?? [],
    nodeMap,
    refresh,
  };
}

/**
 * Hook to fetch a specific node
 * Derives from useNodes for consistency
 */
export function useNode(deviceId: number, nodeNum: number) {
  const { nodes, refresh: refreshAll } = useNodes(deviceId);
  const node = useMemo(
    () => nodes.find((n) => n.nodeNum === nodeNum),
    [nodes, nodeNum],
  );

  const refresh = useCallback(async (): Promise<
    Result<Node | undefined, NodeError>
  > => {
    const result = await refreshAll();
    if (result.isOk()) {
      const found = result.value.find((n) => n.nodeNum === nodeNum);
      return okAsync(found);
    }
    return result.map(() => undefined);
  }, [refreshAll, nodeNum]);

  return { node, refresh };
}

/**
 * Hook to fetch favorite nodes
 * Derives from useNodes for consistency
 */
export function useFavoriteNodes(deviceId: number) {
  const { nodes: allNodes, refresh } = useNodes(deviceId);
  const nodes = useMemo(() => allNodes.filter((n) => n.isFavorite), [allNodes]);

  return { nodes, refresh };
}

/**
 * Hook to fetch recently heard nodes
 * Derives from useNodes for consistency
 */
export function useRecentNodes(deviceId: number, sinceTimestamp: number) {
  const { nodes: allNodes, refresh } = useNodes(deviceId);
  const nodes = useMemo(
    () =>
      allNodes.filter(
        (n) => n.lastHeard && n.lastHeard.getTime() > sinceTimestamp,
      ),
    [allNodes, sinceTimestamp],
  );

  return { nodes, refresh };
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
  const query = useMemo(() => {
    const conditions = [
      eq(positionLogs.ownerNodeNum, deviceId),
      eq(positionLogs.nodeNum, nodeNum),
    ];

    if (since) {
      conditions.push(gt(positionLogs.time, new Date(since)));
    }

    return getDb()
      .select()
      .from(positionLogs)
      .where(and(...conditions))
      .orderBy(desc(positionLogs.time))
      .limit(limit);
  }, [deviceId, nodeNum, since, limit]);

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(async (): Promise<
    Result<PositionLog[], NodeError>
  > => {
    return okAsync(data ?? []);
  }, [data]);

  return {
    positions: data ?? [],
    refresh,
    isLoading: status === "pending" && !data,
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
  const query = useMemo(() => {
    const conditions = [
      eq(telemetryLogs.ownerNodeNum, deviceId),
      eq(telemetryLogs.nodeNum, nodeNum),
    ];

    if (since) {
      conditions.push(gt(telemetryLogs.time, new Date(since)));
    }

    return getDb()
      .select()
      .from(telemetryLogs)
      .where(and(...conditions))
      .orderBy(desc(telemetryLogs.time))
      .limit(limit);
  }, [deviceId, nodeNum, since, limit]);

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(async (): Promise<
    Result<TelemetryLog[], NodeError>
  > => {
    return okAsync(data ?? []);
  }, [data]);

  return {
    telemetry: data ?? [],
    refresh,
    isLoading: status === "pending" && !data,
  };
}

/**
 * Hook to fetch position history for multiple nodes at once
 */
export function usePositionTrails(
  deviceId: number,
  nodeNums: number[],
  since?: number,
  limitPerNode = 100,
) {
  // Keeping this as non-reactive for now as it involves complex logic
  // that is not easily mapable to a single reactive query without window functions
  // or multiple hooks.
  const [trails, setTrails] = useState<Map<number, PositionLog[]>>(new Map());

  const stableNodeNums = useMemo(() => nodeNums, [nodeNums]);

  const refresh = useCallback(async (): Promise<
    Result<Map<number, PositionLog[]>, NodeError>
  > => {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getPositionHistoryForNodes(
        deviceId,
        stableNodeNums,
        since,
        limitPerNode,
      ),
      (cause) => NodeError.getPositionHistoryForNodes(deviceId, cause),
    );
    if (result.isOk()) {
      setTrails(result.value);
    }
    return result;
  }, [deviceId, stableNodeNums, since, limitPerNode]);

  useEffect(() => {
    if (stableNodeNums.length > 0) {
      refresh();
    } else {
      setTrails(new Map());
    }
  }, [refresh, stableNodeNums]);

  return { trails, refresh };
}
