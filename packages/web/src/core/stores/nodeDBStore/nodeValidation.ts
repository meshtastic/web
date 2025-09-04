import type { NodeErrorType } from "@core/stores";
import type { Protobuf } from "@meshtastic/core";

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
      oldNode.user?.publicKey === newNode.user?.publicKey ||
      oldNode.user?.publicKey === undefined ||
      oldNode.user?.publicKey.length === 0;

    if (isKeyMatchingOrExistingEmpty) {
      // Keys match or existing key was empty: trust the incoming node data completely.
      // This allows for legitimate updates to user info and other fields.
      return newNode;
    } else {
      // Keys do not match and existing key was not empty: potential impersonation attempt.
      setNodeError(num, "MISMATCH_PKI");
      return oldNode; // drop newNode fields and return old
    }
  } else {
    // Multiple existing nodes with the same node number
    // This should never happen, but if it does, we drop the new node entirely.
    setNodeError(num, "DUPLICATE_PKI");
    return undefined; // drop newNode entirely
  }
}
