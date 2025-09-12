import type { NodeErrorType } from "@core/stores";
import type { Protobuf } from "@meshtastic/core";
import { fromByteArray } from "base64-js";

export function equalKey(
  a?: Uint8Array | null,
  b?: Uint8Array | null,
): boolean {
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const len = a.byteLength;
  if (len !== b.byteLength) {
    return false;
  }
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

// Validates a new incoming node against existing nodes.
// If valid, returns a node to store, else returns undefined.
export function validateIncomingNode(
  newNode: Protobuf.Mesh.NodeInfo,
  setNodeError: (nodeNum: number, error: NodeErrorType) => void,
  getNodes: (
    filter?: (node: Protobuf.Mesh.NodeInfo) => boolean,
  ) => Protobuf.Mesh.NodeInfo[],
): Protobuf.Mesh.NodeInfo | undefined {
  const num = newNode.num;
  const existingNodes = getNodes((node) => node.num === num);

  if (existingNodes.length === 0) {
    // No existing node with this node number.
    // Check if the new node's public key (if present and not empty)
    // is already claimed by another existing node.
    if (
      newNode.user?.publicKey !== undefined &&
      newNode.user?.publicKey.length > 0
    ) {
      const nodesWithSameKey = getNodes(
        (node) => node.user?.publicKey === newNode.user?.publicKey,
      );
      if (nodesWithSameKey.length > 0) {
        // This is a potential impersonation attempt.

        console.warn(
          `Node ${num} rejected: Public key already claimed by another node. Key:`,
          fromByteArray(newNode.user?.publicKey ?? new Uint8Array()),
        );

        setNodeError(num, "DUPLICATE_PKI");
        return undefined; // drop newNode entirely
      }
    }
    return newNode; // No conflicts, accept newNode
  } else if (existingNodes.length === 1) {
    // One existing node with this node number.
    const oldNode = existingNodes[0];
    if (!oldNode) {
      return undefined;
    }

    // A public key is considered matching if the incoming key equals
    // the existing key, OR if the existing key is empty.
    const isKeyMatchingOrExistingEmpty =
      equalKey(oldNode.user?.publicKey, newNode.user?.publicKey) ||
      oldNode.user?.publicKey === undefined ||
      oldNode.user?.publicKey.length === 0;

    if (isKeyMatchingOrExistingEmpty) {
      // Keys match or existing key was empty: trust the incoming node data completely.
      // This allows for legitimate updates to user info and other fields.
      return newNode;
    } else if (
      newNode.user?.publicKey !== undefined &&
      newNode.user?.publicKey.length > 0
    ) {
      console.warn(
        `Node ${num} rejected: existing key does not match incoming key. Old key:`,
        fromByteArray(oldNode.user?.publicKey ?? new Uint8Array()),
        "New key:",
        fromByteArray(newNode.user?.publicKey ?? new Uint8Array()),
      );

      // Keys do not match and existing key was not empty: potential impersonation attempt.
      setNodeError(num, "MISMATCH_PKI");
      return oldNode; // drop newNode fields and return old
    } else {
      // Incoming node has no public key: ignore the new node entirely.
      console.warn(
        `Node ${num} rejected: incoming node has no public key, but existing does.`,
      );
      return oldNode; // drop newNode fields and return old
    }
  } else {
    // Multiple existing nodes with the same node number
    // This should never happen, but if it does, we drop the new node entirely.
    console.warn(
      `Node ${num} rejected: Multiple existing nodes with this node number.`,
    );

    setNodeError(num, "DUPLICATE_PKI");
    return undefined; // drop newNode entirely
  }
}
