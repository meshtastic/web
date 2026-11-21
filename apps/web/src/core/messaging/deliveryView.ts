import { type Message, MessageState } from "@core/storage/types.ts";
import {
  type MessageStatusPresentation,
  messageStatus,
} from "@core/utils/messageStatus.ts";
import type { DeliveryState } from "./deliveryState.ts";
import { LegacyMessageState } from "./legacyStatusState.ts";

/**
 * The delivery line under an outgoing bubble, per the design:
 *
 * - `delivered`: "Delivered" with a double tick;
 * - `proofFailed`: acknowledged, but the delivery proof didn't check out
 *   (something other than the recipient acked it), shown in warning colour;
 * - `heardBy`: "Heard by N nodes" (channels);
 * - `pending`: "Waiting for acknowledgement" with a clock, or "Relayed,
 *   waiting for acknowledgement" once a relay acked a DM;
 * - `failed`: "Not delivered (reason)" in red, with Retry.
 *
 * `reasonKey` is a `messages:status.*` key for the failure's reason, shared
 * with the delivery details dialog.
 */
export type DeliveryLine =
  | { readonly kind: "delivered"; readonly proven: boolean }
  | { readonly kind: "proofFailed" }
  | { readonly kind: "heardBy"; readonly count: number }
  | { readonly kind: "pending"; readonly relayed: boolean }
  | {
      readonly kind: "failed";
      readonly reasonKey?: string;
      readonly retryable: boolean;
    };

const toStatusState = (state: MessageState) => {
  switch (state) {
    case MessageState.Ack:
      return LegacyMessageState.Ack;
    case MessageState.Delivered:
      return LegacyMessageState.Delivered;
    case MessageState.Pending:
      return LegacyMessageState.Waiting;
    case MessageState.Failed:
      return LegacyMessageState.Failed;
  }
};

/** The full status (text, detail, proof, retry) for the details dialog. */
export const deliveryStatus = (
  message: Pick<Message, "state" | "routingError" | "ackProof" | "type">,
): MessageStatusPresentation =>
  messageStatus(
    {
      state: toStatusState(message.state),
      ...(message.routingError === undefined
        ? {}
        : { routingError: message.routingError }),
      ...(message.ackProof === undefined ? {} : { ackProof: message.ackProof }),
    },
    message.type === "direct",
  );

export const deliveryLine = (
  delivery: DeliveryState,
  message: Pick<Message, "state" | "routingError" | "ackProof" | "type">,
): DeliveryLine => {
  switch (delivery.kind) {
    case "delivered": {
      const proof = deliveryStatus(message).proofKey;
      return proof === "failed"
        ? { kind: "proofFailed" }
        : { kind: "delivered", proven: proof === "verified" };
    }
    case "heardBy":
      return { kind: "heardBy", count: delivery.count };
    case "pending":
      return { kind: "pending", relayed: delivery.relayed };
    case "failed": {
      const status = deliveryStatus(message);
      return {
        kind: "failed",
        ...(message.routingError === undefined
          ? {}
          : { reasonKey: status.textKey }),
        retryable: status.retryable,
      };
    }
  }
};
