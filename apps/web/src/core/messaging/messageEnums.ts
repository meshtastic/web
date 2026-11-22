/**
 * The pre-SDK message state and type enums, still taken by the delivery
 * status presentation (`messageStatus`).
 */

export enum MessageState {
  /** The addressed node acked it (and every inbound message). */
  Ack = "ack",
  /** Acked by a relay, or heard rebroadcast: on the mesh, not confirmed. */
  Delivered = "delivered",
  Waiting = "waiting",
  Failed = "failed",
}

export enum MessageType {
  Direct = "direct",
  Broadcast = "broadcast",
}
