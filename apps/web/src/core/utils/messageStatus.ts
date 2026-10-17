import { MessageState } from "@core/stores/messageStore";
import { Protobuf } from "@meshtastic/sdk";

const RoutingError = Protobuf.Mesh.Routing_Error;
const AckProof = Protobuf.Mesh.MeshPacket_AckProofStatus;

/** Colour family of a status, as the Android app's messageStatusColor. */
export type MessageStatusTone = "success" | "pending" | "warning" | "error";

export interface MessageStatusPresentation {
  /** Key under `messages:status.*` for the one-line status. */
  textKey: string;
  /** Key under `messages:status.*` for the details dialog title. */
  titleKey: "title" | "errorTitle";
  /** Key under `messages:status.detail.*`, for failures that have one. */
  detailKey?: string;
  /** Key under `messages:status.proof.*` when the ack carried a proof. */
  proofKey?: "verified" | "failed" | "noKey";
  tone: MessageStatusTone;
  /** Offer to send it again. */
  retryable: boolean;
}

interface StatusInput {
  state: MessageState;
  routingError?: Protobuf.Mesh.Routing_Error;
  ackProof?: Protobuf.Mesh.MeshPacket_AckProofStatus;
}

/** Short text for a NAK, after Android's getMessageRoutingErrorStringResFrom. */
const ERROR_TEXT: Partial<Record<Protobuf.Mesh.Routing_Error, string>> = {
  [RoutingError.GOT_NAK]: "maxRetransmit",
  [RoutingError.TIMEOUT]: "maxRetransmit",
  [RoutingError.MAX_RETRANSMIT]: "maxRetransmit",
  [RoutingError.NO_ROUTE]: "noRoute",
  [RoutingError.NO_CHANNEL]: "noChannel",
  [RoutingError.NO_INTERFACE]: "noInterface",
  [RoutingError.DUTY_CYCLE_LIMIT]: "dutyCycleLimit",
  [RoutingError.RATE_LIMIT_EXCEEDED]: "rateLimitExceeded",
  [RoutingError.TOO_LARGE]: "tooLarge",
  [RoutingError.NO_RESPONSE]: "noResponse",
  [RoutingError.BAD_REQUEST]: "badRequest",
  [RoutingError.NOT_AUTHORIZED]: "notAuthorized",
  [RoutingError.PKI_FAILED]: "pkiFailed",
  [RoutingError.PKI_UNKNOWN_PUBKEY]: "pkiUnknownPubkey",
  [RoutingError.PKI_SEND_FAIL_PUBLIC_KEY]: "pkiSendFailPublicKey",
  [RoutingError.ADMIN_BAD_SESSION_KEY]: "adminBadSessionKey",
  [RoutingError.ADMIN_PUBLIC_KEY_UNAUTHORIZED]: "adminPublicKeyUnauthorized",
};

/** Failures where sending the same thing again can't help. */
const NOT_RETRYABLE = new Set<Protobuf.Mesh.Routing_Error>([
  RoutingError.NO_CHANNEL,
  RoutingError.TOO_LARGE,
]);

/**
 * How to show an outbound message's delivery status, after the Android app
 * (core/model Message.kt: getMessageStatusStringRes, isMessageStatusRetryable,
 * and MessageItem's warning colour):
 *
 * - A forged ack proof overrides everything: "Delivery proof failed".
 * - Acked by the recipient: "Delivered to recipient", "· proven" with a
 *   valid proof.
 * - Acked by the mesh: a broadcast is "Delivered to mesh"; a direct message
 *   is "Relayed, not confirmed by recipient", shown as a warning and
 *   retryable.
 * - Failed: the NAK's reason, with a longer explanation in the details.
 */
export function messageStatus(
  message: StatusInput,
  isDirectMessage: boolean,
): MessageStatusPresentation {
  const forged = message.ackProof === AckProof.ACK_PROOF_INVALID;
  const proven = message.ackProof === AckProof.ACK_PROOF_VALID;
  const proofKey = proven
    ? "verified"
    : forged
      ? "failed"
      : message.ackProof === AckProof.ACK_PROOF_NO_KEY
        ? "noKey"
        : undefined;
  const failed = message.state === MessageState.Failed;
  const errorKey =
    message.routingError !== undefined
      ? (ERROR_TEXT[message.routingError] ?? "unknownError")
      : "unknownError";

  const textKey = forged
    ? "ackProofInvalid"
    : message.state === MessageState.Ack
      ? proven
        ? "recipientDeliveredProven"
        : "recipientDelivered"
      : message.state === MessageState.Delivered
        ? isDirectMessage
          ? "relayedNotConfirmed"
          : "delivered"
        : message.state === MessageState.Waiting
          ? "enroute"
          : failed
            ? `error.${errorKey}`
            : "unknown";

  const directUnconfirmed =
    message.state === MessageState.Delivered && isDirectMessage;
  const retryable =
    directUnconfirmed ||
    (failed &&
      (message.routingError === undefined ||
        !NOT_RETRYABLE.has(message.routingError)));

  const tone: MessageStatusTone =
    forged || directUnconfirmed || (failed && retryable)
      ? "warning"
      : failed
        ? "error"
        : message.state === MessageState.Waiting
          ? "pending"
          : "success";

  return {
    textKey,
    titleKey:
      failed && message.routingError !== undefined ? "errorTitle" : "title",
    detailKey:
      failed && message.routingError !== undefined
        ? detailKeyFor(message.routingError)
        : undefined,
    proofKey,
    tone,
    retryable,
  };
}

/** Android has a distinct detail for each reason, even ones sharing text. */
function detailKeyFor(error: Protobuf.Mesh.Routing_Error): string | undefined {
  switch (error) {
    case RoutingError.GOT_NAK:
      return "gotNak";
    case RoutingError.TIMEOUT:
      return "timeout";
    default:
      return ERROR_TEXT[error];
  }
}
