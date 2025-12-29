import { NodeError } from "@data/errors";
import { DB_EVENTS, dbEvents } from "@data/events";
import { nodeRepo } from "@data/repositories";
import type { Node, PositionLog, TelemetryLog } from "@data/schema";
import type { Result } from "neverthrow";
import { ResultAsync } from "neverthrow";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Cache for node data keyed by deviceId
 * Supports useSyncExternalStore's synchronous getSnapshot requirement
 */
class NodeCache {
  private nodes = new Map<number, Node[]>();
  private listeners = new Set<() => void>();
  private static readonly EMPTY_NODES: Node[] = [];

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  get(deviceId: number): Node[] {
    return this.nodes.get(deviceId) ?? NodeCache.EMPTY_NODES;
  }

  set(deviceId: number, nodes: Node[]): void {
    this.nodes.set(deviceId, nodes);
    this.notify();
  }

  async refresh(deviceId: number): Promise<Result<Node[], NodeError>> {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getNodes(deviceId),
      (cause) => NodeError.getNodes(deviceId, cause),
    );
    if (result.isOk()) {
      this.set(deviceId, result.value);
    }
    return result;
  }
}

const nodeCache = new NodeCache();

/**
 * Hook to fetch all nodes for a device
 * Uses useSyncExternalStore for tear-free concurrent rendering
 */
export function useNodes(deviceId: number) {
  // Subscribe to both cache changes and database events
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubCache = nodeCache.subscribe(onStoreChange);
      const unsubDb = dbEvents.subscribe(DB_EVENTS.NODE_UPDATED, () => {
        nodeCache.refresh(deviceId);
      });

      return () => {
        unsubCache();
        unsubDb();
      };
    },
    [deviceId],
  );

  const getSnapshot = useCallback(() => nodeCache.get(deviceId), [deviceId]);

  const nodes = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    nodeCache.refresh(deviceId);
  }, [deviceId]);

  // Map nodeNum -> Node
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.nodeNum, node])),
    [nodes],
  );

  const refresh = useCallback(() => nodeCache.refresh(deviceId), [deviceId]);

  return { nodes, nodeMap, refresh };
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
      return ResultAsync.ok(found);
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
  const [positions, setPositions] = useState<PositionLog[]>([]);

  const refresh = useCallback(async (): Promise<
    Result<PositionLog[], NodeError>
  > => {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getPositionHistory(deviceId, nodeNum, since, limit),
      (cause) => NodeError.getPositionHistory(deviceId, nodeNum, cause),
    );
    if (result.isOk()) {
      setPositions(result.value);
    }
    return result;
  }, [deviceId, nodeNum, since, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { positions, refresh };
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
  const [telemetry, setTelemetry] = useState<TelemetryLog[]>([]);

  const refresh = useCallback(async (): Promise<
    Result<TelemetryLog[], NodeError>
  > => {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getTelemetryHistory(deviceId, nodeNum, since, limit),
      (cause) => NodeError.getTelemetryHistory(deviceId, nodeNum, cause),
    );
    if (result.isOk()) {
      setTelemetry(result.value);
    }
    return result;
  }, [deviceId, nodeNum, since, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { telemetry, refresh };
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
