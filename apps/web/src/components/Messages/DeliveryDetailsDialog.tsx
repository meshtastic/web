import { DialogWrapper } from "@components/Dialog/DialogWrapper.tsx";
import { deliveryStatus } from "@core/messaging/deliveryView.ts";
import type { Message } from "@core/storage/types.ts";
import { cn } from "@core/utils/cn.ts";
import { useTranslation } from "react-i18next";

export interface DeliveryDetailsDialogProps {
  /** The message to explain; the dialog is closed while undefined. */
  message: Message | undefined;
  /**
   * Sent from this radio. A received message shows only its relay: it has
   * no delivery status, acks or proof of its own.
   */
  outgoing?: boolean;
  /**
   * The relaying node as shown (`Name (0x5A)`): of a received message, or
   * of the latest ack of an outgoing one. Omitted when none was recorded.
   */
  relay?: string;
  onOpenChange: (open: boolean) => void;
  /** Sends it again; omitted when that can't help or there's no connection. */
  onResend?: (message: Message) => void;
}

/**
 * What happened to an outgoing message, after the Android app's status
 * details: the status, why it failed, how many nodes acked it, which node
 * relayed the ack back, and the delivery proof, with Resend when sending
 * again can help. For a received message, the node that relayed it to us.
 */
export const DeliveryDetailsDialog = ({
  message,
  outgoing = true,
  relay,
  onOpenChange,
  onResend,
}: DeliveryDetailsDialogProps) => {
  const { t } = useTranslation("messages");
  const status = message && outgoing ? deliveryStatus(message) : undefined;
  const canResend = Boolean(message && status?.retryable && onResend);
  // A direct message's relay is that of the recipient's ack (as on Android).
  const relayLine =
    relay === undefined
      ? undefined
      : outgoing && message?.type === "direct"
        ? t("status.ackRelayedBy", { relay })
        : t("status.relayedBy", { relay });

  return (
    <DialogWrapper
      open={message !== undefined}
      onOpenChange={onOpenChange}
      type={canResend ? "confirm" : "info"}
      title={
        outgoing
          ? t(`status.${status?.titleKey ?? "title"}`)
          : t("bubble.deliveryDetails")
      }
      confirmText={t("status.resend")}
      cancelText={t("status.close")}
      dismissText={t("status.close")}
      onConfirm={
        canResend && message && onResend
          ? () => {
              onResend(message);
              onOpenChange(false);
            }
          : undefined
      }
    >
      {message && !outgoing ? (
        <div className="flex flex-col gap-2 text-center text-body">
          {relayLine ? <p className="m-0">{relayLine}</p> : null}
        </div>
      ) : null}
      {message && status ? (
        <div className="flex flex-col gap-2 text-center text-body">
          <p className="m-0">{t(`status.${status.textKey}`)}</p>
          {status.detailKey ? (
            <p className="m-0 text-secondary">
              {t(`status.detail.${status.detailKey}`)}
            </p>
          ) : null}
          {(message.relays ?? 0) > 0 ? (
            <p className="m-0 text-secondary">
              {t("status.relays", { count: message.relays })}
            </p>
          ) : null}
          {relayLine ? <p className="m-0 text-secondary">{relayLine}</p> : null}
          {status.proofKey ? (
            <div
              className={cn(
                "flex flex-col gap-0.5",
                status.proofKey === "failed" && "text-danger",
                status.proofKey === "verified" && "text-accent",
              )}
            >
              <p className="m-0 font-medium">
                {t(`status.proof.${status.proofKey}`)}
              </p>
              <p className="m-0">{t(`status.proof.${status.proofKey}Info`)}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </DialogWrapper>
  );
};
