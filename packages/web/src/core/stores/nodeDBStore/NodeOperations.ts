import type { Protobuf } from "@meshtastic/core";

/**
 * Core interface for node storage operations.
 * Provides a clean, minimal API for managing node data without
 * the complexity of the full NodeDB store interface.
 */
export interface NodeOperations {
  // Core CRUD operations
  get(nodeNum: number): Protobuf.Mesh.NodeInfo | undefined;
  set(nodeNum: number, node: Protobuf.Mesh.NodeInfo): void;
  update(nodeNum: number, updates: Partial<Protobuf.Mesh.NodeInfo>): void;
  upsert(nodeNum: number, node: Protobuf.Mesh.NodeInfo): void;

  // Batch operations
  getAll(): Protobuf.Mesh.NodeInfo[];
  clear(): void;
  delete(nodeNum: number): boolean;

  // Utility methods
  has(nodeNum: number): boolean;
  size(): number;

  // Convenience methods for common patterns
  updateUser(nodeNum: number, user: Protobuf.Mesh.User): void;
  updatePosition(nodeNum: number, position: Protobuf.Mesh.Position): void;
  updateLastHeard(nodeNum: number, time: number, snr?: number): void;
}
