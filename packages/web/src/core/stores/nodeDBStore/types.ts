import type { Protobuf } from "@meshtastic/core";

type NodeErrorType =
  | Protobuf.Mesh.Routing_Error
  | "MISMATCH_PKI"
  | "DUPLICATE_PKI";

type NodeError = {
  node: number;
  error: NodeErrorType;
};

type ProcessPacketParams = {
  from: number;
  snr: number;
  time: number;
  hopStart: number;
  hopLimit: number;
  hasBitfield: boolean;
};

export type { NodeError, ProcessPacketParams, NodeErrorType };
