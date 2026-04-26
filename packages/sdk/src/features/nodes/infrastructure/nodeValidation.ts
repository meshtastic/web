import type * as Protobuf from "@meshtastic/protobufs";
import type { Node } from "../domain/Node.ts";
import type { NodeErrorType } from "../domain/NodeError.ts";

/**
 * Byte-equal compare for two public keys. Empty / undefined keys never
 * match each other.
 */
export function equalKey(a?: Uint8Array | null, b?: Uint8Array | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface ValidatedNodeInfo {
  /** The NodeInfo to commit to the store. `undefined` when the incoming node should be dropped entirely. */
  readonly accepted: Protobuf.Mesh.NodeInfo | undefined;
  /** Optional error to record against the incoming node's number. */
  readonly error: NodeErrorType | undefined;
}

/**
 * Validates an incoming NodeInfo against the existing snapshot of nodes.
 * Pure — no side effects. Caller decides what to do with the verdict.
 *
 * Mirrors the previous web-side validation in
 * `packages/web/src/core/stores/nodeDBStore/nodeValidation.ts` but returns
 * the verdict instead of pushing into a Zustand store.
 */
export function validateIncomingNode(
  newNode: Protobuf.Mesh.NodeInfo,
  existingByNum: ReadonlyMap<number, Node>,
): ValidatedNodeInfo {
  const num = newNode.num;
  const existing = existingByNum.get(num);
  const newKey = newNode.user?.publicKey;

  if (!existing) {
    if (newKey && newKey.length > 0) {
      // Reject if another node already presents this public key —
      // potential impersonation.
      for (const node of existingByNum.values()) {
        const otherKey = node.user?.publicKey;
        if (otherKey && otherKey.length > 0 && equalKey(otherKey, newKey)) {
          return { accepted: undefined, error: "DUPLICATE_PKI" };
        }
      }
    }
    return { accepted: newNode, error: undefined };
  }

  const oldKey = existing.user?.publicKey;
  const oldKeyEmpty = !oldKey || oldKey.length === 0;

  if (oldKeyEmpty || equalKey(oldKey, newKey)) {
    // Trust the incoming update.
    return { accepted: newNode, error: undefined };
  }

  if (newKey && newKey.length > 0) {
    // Existing node has a key, incoming has a different key — mismatch.
    return { accepted: undefined, error: "MISMATCH_PKI" };
  }

  // Incoming has no key, existing does — silently drop the update.
  return { accepted: undefined, error: undefined };
}
