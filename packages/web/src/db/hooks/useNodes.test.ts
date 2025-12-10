import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useNodes,
  useNode,
  useFavoriteNodes,
  useRecentNodes,
  usePositionHistory,
  useTelemetryHistory,
  usePositionTrails,
} from "./useNodes";
import { nodeRepo } from "../repositories";
import { dbEvents, DB_EVENTS } from "../events";

// Mock dependencies
vi.mock("../repositories", () => ({
  nodeRepo: {
    getNodes: vi.fn(),
    getNode: vi.fn(),
    getFavorites: vi.fn(),
    getRecentNodes: vi.fn(),
    getPositionHistory: vi.fn(),
    getTelemetryHistory: vi.fn(),
    getPositionHistoryForNodes: vi.fn(),
  },
}));

vi.mock("../events", () => ({
  dbEvents: {
    subscribe: vi.fn(),
  },
  DB_EVENTS: {
    NODE_UPDATED: "NODE_UPDATED",
  },
}));

describe("useNodes hooks", () => {
  const deviceId = 123;
  const nodeNum = 456;
  const mockNodes = [{ num: nodeNum, user: { longName: "Test Node" } }];

  beforeEach(() => {
    vi.clearAllMocks();
    (dbEvents.subscribe as vi.Mock).mockReturnValue(vi.fn());
  });

  describe("useNodes", () => {
    it("should fetch all nodes and subscribe to updates", async () => {
      (nodeRepo.getNodes as vi.Mock).mockResolvedValue(mockNodes);

      const { result } = renderHook(() => useNodes(deviceId));

      await waitFor(() => {
        expect(result.current.nodes).toEqual(mockNodes);
      });

      expect(nodeRepo.getNodes).toHaveBeenCalledWith(deviceId);
      expect(dbEvents.subscribe).toHaveBeenCalledWith(DB_EVENTS.NODE_UPDATED, expect.any(Function));
    });
  });

  describe("useNode", () => {
    it("should fetch a specific node", async () => {
      (nodeRepo.getNode as vi.Mock).mockResolvedValue(mockNodes[0]);

      const { result } = renderHook(() => useNode(deviceId, nodeNum));

      await waitFor(() => {
        expect(result.current.node).toEqual(mockNodes[0]);
      });

      expect(nodeRepo.getNode).toHaveBeenCalledWith(deviceId, nodeNum);
    });
  });

  describe("useFavoriteNodes", () => {
    it("should fetch favorite nodes", async () => {
      (nodeRepo.getFavorites as vi.Mock).mockResolvedValue(mockNodes);

      const { result } = renderHook(() => useFavoriteNodes(deviceId));

      await waitFor(() => {
        expect(result.current.nodes).toEqual(mockNodes);
      });

      expect(nodeRepo.getFavorites).toHaveBeenCalledWith(deviceId);
    });
  });

  describe("useRecentNodes", () => {
    it("should fetch recent nodes", async () => {
      const since = 1000;
      (nodeRepo.getRecentNodes as vi.Mock).mockResolvedValue(mockNodes);

      const { result } = renderHook(() => useRecentNodes(deviceId, since));

      await waitFor(() => {
        expect(result.current.nodes).toEqual(mockNodes);
      });

      expect(nodeRepo.getRecentNodes).toHaveBeenCalledWith(deviceId, since);
    });
  });

  describe("usePositionHistory", () => {
    it("should fetch position history", async () => {
      const mockPositions = [{ time: 1000, latitude: 1, longitude: 1 }];
      (nodeRepo.getPositionHistory as vi.Mock).mockResolvedValue(mockPositions);

      const { result } = renderHook(() => usePositionHistory(deviceId, nodeNum));

      await waitFor(() => {
        expect(result.current.positions).toEqual(mockPositions);
      });

      expect(nodeRepo.getPositionHistory).toHaveBeenCalledWith(deviceId, nodeNum, undefined, 100);
    });
  });

  describe("useTelemetryHistory", () => {
    it("should fetch telemetry history", async () => {
      const mockTelemetry = [{ time: 1000, batteryLevel: 100 }];
      (nodeRepo.getTelemetryHistory as vi.Mock).mockResolvedValue(mockTelemetry);

      const { result } = renderHook(() => useTelemetryHistory(deviceId, nodeNum));

      await waitFor(() => {
        expect(result.current.telemetry).toEqual(mockTelemetry);
      });

      expect(nodeRepo.getTelemetryHistory).toHaveBeenCalledWith(deviceId, nodeNum, undefined, 100);
    });
  });

  describe("usePositionTrails", () => {
    it("should fetch position trails for multiple nodes", async () => {
      const mockTrails = new Map([[nodeNum, [{ time: 1000, latitude: 1, longitude: 1 }]]]);
      (nodeRepo.getPositionHistoryForNodes as vi.Mock).mockResolvedValue(mockTrails);

      const { result } = renderHook(() => usePositionTrails(deviceId, [nodeNum]));

      await waitFor(() => {
        expect(result.current.trails).toEqual(mockTrails);
      });

      expect(nodeRepo.getPositionHistoryForNodes).toHaveBeenCalledWith(deviceId, [nodeNum], undefined, 100);
    });

    it("should clear trails if nodeNums is empty", async () => {
        const { result } = renderHook(() => usePositionTrails(deviceId, []));
        expect(result.current.trails.size).toBe(0);
        expect(nodeRepo.getPositionHistoryForNodes).not.toHaveBeenCalled();
    });
  });
});
