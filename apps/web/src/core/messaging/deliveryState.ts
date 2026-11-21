import { type Message, MessageState } from "@core/storage/types.ts";

/**
 * What an outgoing bubble shows under its text:
 *
 * - `delivered`: the recipient acked a direct message, or a channel message
 *   was confirmed on the mesh without a relay count (double tick).
 * - `heardBy`: a channel message that `count` nodes were heard relaying.
 * - `pending`: no confirmation yet (clock). `relayed` is set for a direct
 *   message a relay acked but the recipient has not: it is on the mesh, so
 *   the UI can say so, but delivery is still unconfirmed.
 * - `failed`: not delivered (red, with Retry).
 */
export type DeliveryState =
  | { readonly kind: "delivered" }
  | { readonly kind: "heardBy"; readonly count: number }
  | { readonly kind: "pending"; readonly relayed: boolean }
  | { readonly kind: "failed" };

export type DeliveryInput = Pick<Message, "state" | "type" | "relays">;

export const deriveDeliveryState = (message: DeliveryInput): DeliveryState => {
  const relays = Math.max(0, message.relays ?? 0);
  switch (message.state) {
    case MessageState.Failed:
      return { kind: "failed" };
    case MessageState.Pending:
      return { kind: "pending", relayed: false };
    case MessageState.Delivered:
    case MessageState.Ack:
      if (message.type === "broadcast") {
        return relays > 0
          ? { kind: "heardBy", count: relays }
          : { kind: "delivered" };
      }
      return message.state === MessageState.Ack
        ? { kind: "delivered" }
        : { kind: "pending", relayed: true };
  }
};

/** Outgoing messages that can be sent again from the bubble. */
export const isRetryable = (state: DeliveryState): boolean =>
  state.kind === "failed";
