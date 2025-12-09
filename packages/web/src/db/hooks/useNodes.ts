import type { Result } from "neverthrow";
import { ResultAsync } from "neverthrow";
import { useCallback, useEffect, useState } from "react";
import { NodeError } from "../errors";
import { DB_EVENTS, dbEvents } from "../events";
import { nodeRepo } from "../repositories";
import type { Node, PositionLog, TelemetryLog } from "../schema";

/**
 * Hook to fetch all nodes for a device
 */
export function useNodes(deviceId: number) {
  const [nodes, setNodes] = useState<Node[]>([]);

  const refresh = useCallback(async (): Promise<Result<Node[], NodeError>> => {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getNodes(deviceId),
      (cause) => NodeError.getNodes(deviceId, cause),
    );
    if (result.isOk()) {
      setNodes(result.value);
    }
    return result;
  }, [deviceId]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.NODE_UPDATED, () => {
      refresh();
    });

    return unsubscribe;
  }, [deviceId, refresh]);

  return { nodes, refresh };
}

/**
 * Hook to fetch a specific node
 */
export function useNode(deviceId: number, nodeNum: number) {
  const [node, setNode] = useState<Node | undefined>(undefined);

  const refresh = useCallback(async (): Promise<
    Result<Node | undefined, NodeError>
  > => {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getNode(deviceId, nodeNum),
      (cause) => NodeError.getNode(deviceId, nodeNum, cause),
    );
    if (result.isOk()) {
      setNode(result.value);
    }
    return result;
  }, [deviceId, nodeNum]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { node, refresh };
}

/**
 * Hook to fetch favorite nodes
 */
export function useFavoriteNodes(deviceId: number) {
  const [nodes, setNodes] = useState<Node[]>([]);

  const refresh = useCallback(async (): Promise<Result<Node[], NodeError>> => {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getFavorites(deviceId),
      (cause) => NodeError.getFavorites(deviceId, cause),
    );
    if (result.isOk()) {
      setNodes(result.value);
    }
    return result;
  }, [deviceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { nodes, refresh };
}

/**
 * Hook to fetch recently heard nodes
 */
export function useRecentNodes(deviceId: number, sinceTimestamp: number) {
  const [nodes, setNodes] = useState<Node[]>([]);

  const refresh = useCallback(async (): Promise<Result<Node[], NodeError>> => {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getRecentNodes(deviceId, sinceTimestamp),
      (cause) => NodeError.getRecentNodes(deviceId, cause),
    );
    if (result.isOk()) {
      setNodes(result.value);
    }
    return result;
  }, [deviceId, sinceTimestamp]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const refresh = useCallback(async (): Promise<
    Result<Map<number, PositionLog[]>, NodeError>
  > => {
    const result = await ResultAsync.fromPromise(
      nodeRepo.getPositionHistoryForNodes(
        deviceId,
        nodeNums,
        since,
        limitPerNode,
      ),
      (cause) => NodeError.getPositionHistoryForNodes(deviceId, cause),
    );
    if (result.isOk()) {
      setTrails(result.value);
    }
    return result;
  }, [deviceId, nodeNums, since, limitPerNode]);

  useEffect(() => {
    if (nodeNums.length > 0) {
      refresh();
    } else {
      setTrails(new Map());
    }
  }, [deviceId, JSON.stringify(nodeNums), since, limitPerNode, refresh]);

  return { trails, refresh };
}
