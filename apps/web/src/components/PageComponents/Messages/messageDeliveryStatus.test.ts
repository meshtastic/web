import { MessageState, MessageType } from "@core/stores/messageStore";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { getMessageDeliveryStatusInfo } from "./messageDeliveryStatus.ts";

const strings: Record<string, string> = {
  "deliveryStatus.deliveredToMesh.displayText": "Delivered to mesh",
  "deliveryStatus.deliveredToMesh.detailText":
    "At least one node heard this channel message.",
  "deliveryStatus.deliveredToRecipient.displayText": "Delivered to recipient",
  "deliveryStatus.deliveredToRecipient.detailText":
    "The recipient confirmed this direct message.",
  "deliveryStatus.encryptedSendFailed.displayText":
    "Could not send encrypted message",
  "deliveryStatus.encryptedSendFailed.detailText":
    "The radio could not create the encrypted path for this message. Let node info sync, then try again.",
  "deliveryStatus.adminKeyNotAuthorized.displayText":
    "Admin key not authorized",
  "deliveryStatus.adminKeyNotAuthorized.detailText":
    "The admin public key is not authorized on the destination.",
  "deliveryStatus.adminSessionExpired.displayText": "Admin session expired",
  "deliveryStatus.adminSessionExpired.detailText":
    "The admin session key is missing, invalid, or expired. Start a new admin session, then try again.",
  "deliveryStatus.dutyCycleLimit.displayText": "Duty cycle limit",
  "deliveryStatus.dutyCycleLimit.detailText":
    "The radio is temporarily blocked by the regional airtime limit. Try again later.",
  "deliveryStatus.failedToMesh.displayText": "Failed to deliver to mesh",
  "deliveryStatus.failedToMesh.detailText":
    "No node confirmed this message. Try again when you have better signal or more mesh coverage.",
  "deliveryStatus.invalidRequest.displayText": "Invalid request",
  "deliveryStatus.invalidRequest.detailText":
    "The receiving app rejected the request. Check the message or command and try again.",
  "deliveryStatus.messageTooLarge.displayText": "Message is too large to send",
  "deliveryStatus.messageTooLarge.detailText":
    "Shorten the message and send it again.",
  "deliveryStatus.noAppResponse.displayText": "No app response",
  "deliveryStatus.noAppResponse.detailText":
    "The destination received the request, but no app or module responded.",
  "deliveryStatus.noChannel.displayText": "Channel/key mismatch",
  "deliveryStatus.noChannel.detailText":
    "This message could not be encoded or decoded with a matching channel/key. Check the channel and key, then try again.",
  "deliveryStatus.noRadioInterface.displayText": "No radio interface",
  "deliveryStatus.noRadioInterface.detailText":
    "The radio does not have a usable interface for this send.",
  "deliveryStatus.notAuthorized.displayText": "Not authorized",
  "deliveryStatus.notAuthorized.detailText":
    "The destination refused permission for this request.",
  "deliveryStatus.rateLimited.displayText": "Rate limited",
  "deliveryStatus.rateLimited.detailText":
    "Messages are being sent too quickly. Wait a moment, then try again.",
  "deliveryStatus.recipientKeyUnavailable.displayText":
    "Recipient key unavailable",
  "deliveryStatus.recipientKeyUnavailable.detailText":
    "Your node does not have the recipient's public key yet. Wait for node info to sync, then try again.",
  "deliveryStatus.recipientNeedsYourKey.displayText":
    "Recipient needs your key",
  "deliveryStatus.recipientNeedsYourKey.detailText":
    "The recipient does not know your public key yet. Your node may share its info automatically; try again after it syncs.",
  "deliveryStatus.relayed.displayText": "Relayed, not confirmed by recipient",
  "deliveryStatus.relayed.detailText":
    "A node relayed this message, but the recipient has not confirmed it.",
  "deliveryStatus.sending.displayText": "Sending...",
  "deliveryStatus.sending.detailText":
    "The radio is still trying to send this message.",
  "deliveryStatus.unknown.displayText": "Message status unknown",
  "deliveryStatus.unknown.detailText": "The message status is not available.",
};

const t = ((key: string) => strings[key] ?? key) as never;

describe("getMessageDeliveryStatusInfo", () => {
  it.each([
    [
      MessageState.Waiting,
      MessageType.Broadcast,
      undefined,
      "Sending...",
      false,
    ],
    [
      MessageState.Ack,
      MessageType.Broadcast,
      undefined,
      "Delivered to mesh",
      false,
    ],
    [
      MessageState.Ack,
      MessageType.Direct,
      undefined,
      "Delivered to recipient",
      false,
    ],
    [
      MessageState.Relayed,
      MessageType.Direct,
      undefined,
      "Relayed, not confirmed by recipient",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Broadcast,
      Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
      "Failed to deliver to mesh",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Broadcast,
      Protobuf.Mesh.Routing_Error.NO_CHANNEL,
      "Channel/key mismatch",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Broadcast,
      Protobuf.Mesh.Routing_Error.NO_INTERFACE,
      "No radio interface",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Broadcast,
      Protobuf.Mesh.Routing_Error.DUTY_CYCLE_LIMIT,
      "Duty cycle limit",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Broadcast,
      Protobuf.Mesh.Routing_Error.RATE_LIMIT_EXCEEDED,
      "Rate limited",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Direct,
      Protobuf.Mesh.Routing_Error.PKI_FAILED,
      "Could not send encrypted message",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Direct,
      Protobuf.Mesh.Routing_Error.PKI_SEND_FAIL_PUBLIC_KEY,
      "Recipient key unavailable",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Direct,
      Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY,
      "Recipient needs your key",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Broadcast,
      Protobuf.Mesh.Routing_Error.TOO_LARGE,
      "Message is too large to send",
      false,
    ],
    [
      MessageState.Failed,
      MessageType.Direct,
      Protobuf.Mesh.Routing_Error.NO_RESPONSE,
      "No app response",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Direct,
      Protobuf.Mesh.Routing_Error.BAD_REQUEST,
      "Invalid request",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Direct,
      Protobuf.Mesh.Routing_Error.NOT_AUTHORIZED,
      "Not authorized",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Direct,
      Protobuf.Mesh.Routing_Error.ADMIN_BAD_SESSION_KEY,
      "Admin session expired",
      true,
    ],
    [
      MessageState.Failed,
      MessageType.Direct,
      Protobuf.Mesh.Routing_Error.ADMIN_PUBLIC_KEY_UNAUTHORIZED,
      "Admin key not authorized",
      true,
    ],
  ])(
    "maps %s/%s/%s to %s",
    (state, type, routingError, displayText, canRetry) => {
      const info = getMessageDeliveryStatusInfo(
        { state, type, routingError },
        t,
      );

      expect(info.displayText).toBe(displayText);
      expect(info.ariaLabel).toBe(displayText);
      expect(info.canRetry).toBe(canRetry);
    },
  );

  it("maps NO_CHANNEL to channel/key mismatch detail", () => {
    const info = getMessageDeliveryStatusInfo(
      {
        state: MessageState.Failed,
        type: MessageType.Broadcast,
        routingError: Protobuf.Mesh.Routing_Error.NO_CHANNEL,
      },
      t,
    );

    expect(info.detailText).toBe(
      "This message could not be encoded or decoded with a matching channel/key. Check the channel and key, then try again.",
    );
  });
});
