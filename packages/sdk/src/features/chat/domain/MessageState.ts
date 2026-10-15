/**
 * Delivery state of a message, after the Android app's MessageStatus.
 *
 * - Pending: handed to the radio, no ack yet ("Sending…").
 * - Delivered: acked by a relay, or the radio heard it rebroadcast. For a
 *   broadcast that is success; for a direct message the recipient has not
 *   confirmed it yet.
 * - Ack: the addressed node acked it (and every inbound message).
 * - Failed: a NAK or a local error; see Message.routingError.
 */
export enum MessageState {
  Pending = "pending",
  Delivered = "delivered",
  Ack = "ack",
  Failed = "failed",
}
