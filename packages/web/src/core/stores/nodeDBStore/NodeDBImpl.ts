import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";
import type { NodeOperations } from "./NodeOperations.ts";

/**
 * Core implementation of node storage operations.
 * This is the actual working implementation that handles the Map-based storage
 * and provides the clean interface defined in NodeOperations.
 */
export class NodeDB implements NodeOperations {
  private nodes: Map<number, Protobuf.Mesh.NodeInfo> = new Map();

  get(nodeNum: number): Protobuf.Mesh.NodeInfo | undefined {
    return this.nodes.get(nodeNum);
  }

  set(nodeNum: number, node: Protobuf.Mesh.NodeInfo): void {
    this.nodes.set(nodeNum, { ...node, num: nodeNum });
  }

  update(nodeNum: number, updates: Partial<Protobuf.Mesh.NodeInfo>): void {
    const existing = this.nodes.get(nodeNum);
    if (!existing) {
      throw new Error(`Node ${nodeNum} not found for update`);
    }
    this.nodes.set(nodeNum, { ...existing, ...updates, num: nodeNum });
  }

  upsert(nodeNum: number, node: Protobuf.Mesh.NodeInfo): void {
    const existing = this.nodes.get(nodeNum);
    if (existing) {
      // Merge with existing node, preserving existing fields only if new ones are undefined/null
      this.nodes.set(nodeNum, {
        ...existing,
        ...node,
        num: nodeNum,
        user: node.user !== undefined ? node.user : existing.user,
        position: node.position !== undefined ? node.position : existing.position,
        deviceMetrics: node.deviceMetrics !== undefined ? node.deviceMetrics : existing.deviceMetrics,
      });
    } else {
      this.nodes.set(nodeNum, { ...node, num: nodeNum });
    }
  }
  }

  getAll(): Protobuf.Mesh.NodeInfo[] {
    return Array.from(this.nodes.values());
  }

  clear(): void {
    this.nodes.clear();
  }

  delete(nodeNum: number): boolean {
    return this.nodes.delete(nodeNum);
  }

  has(nodeNum: number): boolean {
    return this.nodes.has(nodeNum);
  }

  size(): number {
    return this.nodes.size;
  }

  // Convenience methods
  updateUser(nodeNum: number, user: Protobuf.Mesh.User): void {
    this.upsert(nodeNum, { user } as Protobuf.Mesh.NodeInfo);
  }

  updatePosition(nodeNum: number, position: Protobuf.Mesh.Position): void {
    this.upsert(nodeNum, { position } as Protobuf.Mesh.NodeInfo);
  }

  updateLastHeard(nodeNum: number, time: number, snr?: number): void {
    const updates: Partial<Protobuf.Mesh.NodeInfo> = { lastHeard: time };
    if (snr !== undefined) {
      updates.snr = snr;
    }
    this.upsert(nodeNum, updates as Protobuf.Mesh.NodeInfo);
  }

  // Legacy compatibility methods
  addNode(nodeInfo: Protobuf.Mesh.NodeInfo): void {
    this.upsert(nodeInfo.num, nodeInfo);
  }

  addUser(user: { from: number; data: Protobuf.Mesh.User }): void {
    this.updateUser(user.from, user.data);
  }

  addPosition(position: { from: number; data: Protobuf.Mesh.Position }): void {
    this.updatePosition(position.from, position.data);
  }

  processPacket(data: { from: number; snr: number; time: number }): void {
    const nowSec = Math.floor(Date.now() / 1000);
    const time = data.time > 0 ? data.time : nowSec;

    if (!this.has(data.from)) {
      // Create minimal node if it doesn't exist
      this.set(
        data.from,
        create(Protobuf.Mesh.NodeInfoSchema, {
          num: data.from,
          lastHeard: time,
          snr: data.snr,
        }),
      );
    } else {
      this.updateLastHeard(data.from, time, data.snr);
    }
  }
}
