import type { Node } from "./Node.ts";

/**
 * Persists the device's view of the mesh node DB.
 *
 * Snapshot semantics: each `upsert` overwrites the previous row for that
 * node number. Implementations can keep additional history (e.g. a
 * lastHeard timestamp series) but must always return the most recent
 * snapshot from `loadAll` and `get`.
 */
export interface NodesRepository {
  loadAll(): Promise<Node[]>;
  get(nodeNum: number): Promise<Node | undefined>;
  upsert(node: Node): Promise<void>;
  upsertBatch(nodes: ReadonlyArray<Node>): Promise<void>;
  remove(nodeNum: number): Promise<void>;
  clear(): Promise<void>;
}
