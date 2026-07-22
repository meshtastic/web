import { MessageState, MessageType } from "@core/stores/messageStore";
import { Protobuf } from "@meshtastic/sdk";
import type { TFunction } from "i18next";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  CircleEllipsis,
  RefreshCcw,
} from "lucide-react";

export interface MessageDeliveryInput {
  state: MessageState;
  type: MessageType;
  routingError?: Protobuf.Mesh.Routing_Error;
}

export interface MessageDeliveryStatusInfo {
  displayText: string;
  detailText: string;
  icon: LucideIcon;
  ariaLabel: string;
  iconClassName: string;
  textClassName: string;
  canRetry: boolean;
}

export function getMessageDeliveryStatusInfo(
  message: MessageDeliveryInput,
  t: TFunction<"messages", undefined>,
): MessageDeliveryStatusInfo {
  switch (message.state) {
    case MessageState.Waiting:
      return {
        displayText: t("deliveryStatus.sending.displayText"),
        detailText: t("deliveryStatus.sending.detailText"),
        icon: CircleEllipsis,
        ariaLabel: t("deliveryStatus.sending.displayText"),
        iconClassName: "text-amber-500 dark:text-amber-400",
        textClassName: "text-amber-700 dark:text-amber-300",
        canRetry: false,
      };
    case MessageState.Ack:
      return message.type === MessageType.Direct
        ? {
            displayText: t("deliveryStatus.deliveredToRecipient.displayText"),
            detailText: t("deliveryStatus.deliveredToRecipient.detailText"),
            icon: CheckCircle2,
            ariaLabel: t("deliveryStatus.deliveredToRecipient.displayText"),
            iconClassName: "text-green-600 dark:text-green-400",
            textClassName: "text-green-700 dark:text-green-300",
            canRetry: false,
          }
        : {
            displayText: t("deliveryStatus.deliveredToMesh.displayText"),
            detailText: t("deliveryStatus.deliveredToMesh.detailText"),
            icon: CheckCircle2,
            ariaLabel: t("deliveryStatus.deliveredToMesh.displayText"),
            iconClassName: "text-green-600 dark:text-green-400",
            textClassName: "text-green-700 dark:text-green-300",
            canRetry: false,
          };
    case MessageState.Relayed:
      return {
        displayText: t("deliveryStatus.relayed.displayText"),
        detailText: t("deliveryStatus.relayed.detailText"),
        icon: RefreshCcw,
        ariaLabel: t("deliveryStatus.relayed.displayText"),
        iconClassName: "text-amber-500 dark:text-amber-400",
        textClassName: "text-amber-700 dark:text-amber-300",
        canRetry: true,
      };
    case MessageState.Failed:
      return getFailureStatusInfo(message.routingError, t);
    default:
      return {
        displayText: t("deliveryStatus.unknown.displayText"),
        detailText: t("deliveryStatus.unknown.detailText"),
        icon: AlertCircle,
        ariaLabel: t("deliveryStatus.unknown.displayText"),
        iconClassName: "text-red-500 dark:text-red-400",
        textClassName: "text-red-700 dark:text-red-300",
        canRetry: true,
      };
  }
}

function getFailureStatusInfo(
  routingError: Protobuf.Mesh.Routing_Error | undefined,
  t: TFunction<"messages", undefined>,
): MessageDeliveryStatusInfo {
  const isPermanent = routingError === Protobuf.Mesh.Routing_Error.TOO_LARGE;
  const failureKey = failureTranslationKey(routingError);

  return {
    displayText: t(`deliveryStatus.${failureKey}.displayText`),
    detailText: t(`deliveryStatus.${failureKey}.detailText`),
    icon: AlertCircle,
    ariaLabel: t(`deliveryStatus.${failureKey}.displayText`),
    iconClassName: isPermanent
      ? "text-red-500 dark:text-red-400"
      : "text-amber-500 dark:text-amber-400",
    textClassName: isPermanent
      ? "text-red-700 dark:text-red-300"
      : "text-amber-700 dark:text-amber-300",
    canRetry: !isPermanent,
  };
}

function failureTranslationKey(
  routingError: Protobuf.Mesh.Routing_Error | undefined,
): string {
  switch (routingError) {
    case Protobuf.Mesh.Routing_Error.NO_CHANNEL:
      return "noChannel";
    case Protobuf.Mesh.Routing_Error.NO_INTERFACE:
      return "noRadioInterface";
    case Protobuf.Mesh.Routing_Error.DUTY_CYCLE_LIMIT:
      return "dutyCycleLimit";
    case Protobuf.Mesh.Routing_Error.RATE_LIMIT_EXCEEDED:
      return "rateLimited";
    case Protobuf.Mesh.Routing_Error.PKI_FAILED:
      return "encryptedSendFailed";
    case Protobuf.Mesh.Routing_Error.PKI_SEND_FAIL_PUBLIC_KEY:
      return "recipientKeyUnavailable";
    case Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY:
      return "recipientNeedsYourKey";
    case Protobuf.Mesh.Routing_Error.TOO_LARGE:
      return "messageTooLarge";
    case Protobuf.Mesh.Routing_Error.NO_RESPONSE:
      return "noAppResponse";
    case Protobuf.Mesh.Routing_Error.BAD_REQUEST:
      return "invalidRequest";
    case Protobuf.Mesh.Routing_Error.NOT_AUTHORIZED:
      return "notAuthorized";
    case Protobuf.Mesh.Routing_Error.ADMIN_BAD_SESSION_KEY:
      return "adminSessionExpired";
    case Protobuf.Mesh.Routing_Error.ADMIN_PUBLIC_KEY_UNAUTHORIZED:
      return "adminKeyNotAuthorized";
    case Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT:
    case Protobuf.Mesh.Routing_Error.TIMEOUT:
    default:
      return "failedToMesh";
  }
}
