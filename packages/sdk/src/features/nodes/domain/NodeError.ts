import type * as Protobuf from "@meshtastic/protobufs";

/**
 * Reasons a node may be flagged as untrusted or unreachable. The two
 * client-only kinds (`MISMATCH_PKI`, `DUPLICATE_PKI`) are produced by the
 * `nodeValidation` mapper when an incoming `NodeInfo` collides with the
 * stored public-key history. Routing errors come straight off the wire
 * via `Routing_Error`.
 */
export type NodeErrorType = Protobuf.Mesh.Routing_Error | "MISMATCH_PKI" | "DUPLICATE_PKI";

export interface NodeError {
  readonly node: number;
  readonly error: NodeErrorType;
}
