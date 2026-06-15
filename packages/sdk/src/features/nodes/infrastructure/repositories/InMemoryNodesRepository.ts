import type { Node } from "../../domain/Node.ts";
import type { NodesRepository } from "../../domain/NodesRepository.ts";

/**
 * Default in-memory NodesRepository — no persistence across reloads.
 */
export class InMemoryNodesRepository implements NodesRepository {
  private readonly map = new Map<number, Node>();

  async loadAll(): Promise<Node[]> {
    return Array.from(this.map.values());
  }

  async get(nodeNum: number): Promise<Node | undefined> {
    return this.map.get(nodeNum);
  }

  async upsert(node: Node): Promise<void> {
    this.map.set(node.num, node);
  }

  async upsertBatch(nodes: ReadonlyArray<Node>): Promise<void> {
    for (const node of nodes) this.map.set(node.num, node);
  }

  async remove(nodeNum: number): Promise<void> {
    this.map.delete(nodeNum);
  }

  async clear(): Promise<void> {
    this.map.clear();
  }
}
