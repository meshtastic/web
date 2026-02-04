import type { MockNodeOptions } from "./generators/nodes.ts";
import { generateMeshNodes } from "./generators/nodes.ts";

export interface MockScenario {
  /** Name of the scenario */
  name: string;
  /** Description of what this scenario tests */
  description: string;
  /** Node number for the "local" device */
  myNodeNum: number;
  /** Nodes in the mesh (excluding the local device) */
  nodes: MockNodeOptions[];
  /** Center latitude for the mesh */
  centerLat: number;
  /** Center longitude for the mesh */
  centerLon: number;
  /** Whether to simulate periodic messages */
  simulateMessages?: boolean;
  /** Whether to simulate position updates */
  simulatePositions?: boolean;
  /** Whether to simulate telemetry updates */
  simulateTelemetry?: boolean;
  /** Interval in ms for simulated activity */
  activityIntervalMs?: number;
}

/**
 * Default scenario: Small mesh with 5 nodes in San Francisco
 */
const defaultScenario: MockScenario = {
  name: "default",
  description: "Small 5-node mesh in San Francisco",
  myNodeNum: 0x12345678,
  centerLat: 37.7749,
  centerLon: -122.4194,
  nodes: generateMeshNodes(5, 37.7749, -122.4194, 3),
  simulateMessages: true,
  simulatePositions: true,
  simulateTelemetry: true,
  activityIntervalMs: 30000, // 30 seconds
};

/**
 * Large mesh scenario: 25 nodes for stress testing
 */
const largeScenario: MockScenario = {
  name: "large",
  description: "Large 25-node mesh for stress testing",
  myNodeNum: 0x12345678,
  centerLat: 37.7749,
  centerLon: -122.4194,
  nodes: generateMeshNodes(25, 37.7749, -122.4194, 10),
  simulateMessages: true,
  simulatePositions: true,
  simulateTelemetry: true,
  activityIntervalMs: 15000, // 15 seconds
};

/**
 * Minimal scenario: Just the local node, no mesh
 */
const minimalScenario: MockScenario = {
  name: "minimal",
  description: "Minimal setup with just local node",
  myNodeNum: 0x12345678,
  centerLat: 37.7749,
  centerLon: -122.4194,
  nodes: [],
  simulateMessages: false,
  simulatePositions: false,
  simulateTelemetry: false,
};

/**
 * Dense urban scenario: Many nodes in close proximity
 */
const denseScenario: MockScenario = {
  name: "dense",
  description: "Dense urban mesh with 15 nodes in 1km radius",
  myNodeNum: 0x12345678,
  centerLat: 40.7128,
  centerLon: -74.006,
  nodes: generateMeshNodes(15, 40.7128, -74.006, 1),
  simulateMessages: true,
  simulatePositions: true,
  simulateTelemetry: true,
  activityIntervalMs: 20000,
};

/**
 * Available scenarios
 */
export const scenarios: Record<string, MockScenario> = {
  default: defaultScenario,
  large: largeScenario,
  minimal: minimalScenario,
  dense: denseScenario,
};

/**
 * Create a custom scenario
 */
export function createScenario(
  options: Partial<MockScenario> & { name: string },
): MockScenario {
  return {
    ...defaultScenario,
    ...options,
  };
}
