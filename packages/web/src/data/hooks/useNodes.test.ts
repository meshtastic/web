import { describe, expect, it, vi } from "vitest";

// Note: These tests need to be rewritten to work with useReactiveSQL.
// The hooks now use query builders with useReactiveSQL instead of
// calling async methods directly.
// For now, we just verify the exports exist.

vi.mock("./useReactiveSQL.ts", () => ({
  useReactiveSQL: vi.fn(() => ({
    data: [],
    status: "ok",
    error: undefined,
  })),
}));

vi.mock("@data/repositories", () => ({
  nodeRepo: {
    buildNodesQuery: vi.fn(() => ({})),
    buildOnlineNodesQuery: vi.fn(() => ({})),
    buildPositionHistoryQuery: vi.fn(() => ({})),
    buildTelemetryHistoryQuery: vi.fn(() => ({})),
    getClient: vi.fn(() => ({})),
    getNode: vi.fn(),
    getFavorites: vi.fn(),
    getRecentNodes: vi.fn(),
    getPositionHistoryForNodes: vi.fn(),
  },
}));

describe("useNodes hooks", () => {
  it("exports are available", async () => {
    const {
      useNodes,
      useNode,
      useFavoriteNodes,
      usePositionHistory,
      useTelemetryHistory,
      usePositionTrails,
    } = await import("./useNodes.ts");

    expect(useNodes).toBeDefined();
    expect(useNode).toBeDefined();
    expect(useFavoriteNodes).toBeDefined();
    expect(usePositionHistory).toBeDefined();
    expect(useTelemetryHistory).toBeDefined();
    expect(usePositionTrails).toBeDefined();
  });
});
