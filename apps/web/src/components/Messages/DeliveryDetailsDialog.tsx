import { DialogWrapper } from "@components/Dialog/DialogWrapper.tsx";
import { deliveryStatus } from "@core/messaging/deliveryView.ts";
import type { Message } from "@core/storage/types.ts";
import { cn } from "@core/utils/cn.ts";
import { useTranslation } from "react-i18next";

export interface DeliveryDetailsDialogProps {
  /** The outgoing message to explain; the dialog is closed while undefined. */
  message: Message | undefined;
  onOpenChange: (open: boolean) => void;
  /** Sends it again; omitted when that can't help or there's no connection. */
  onResend?: (message: Message) => void;
}

/**
 * What happened to an outgoing message, after the Android app's status
 * details: the status, why it failed, how many nodes acked it, and the
 * delivery proof, with Resend when sending again can help.
 */
export const DeliveryDetailsDialog = ({
  message,
  onOpenChange,
  onResend,
}: DeliveryDetailsDialogProps) => {
  const { t } = useTranslation("messages");
  const status = message ? deliveryStatus(message) : undefined;
  const canResend = Boolean(message && status?.retryable && onResend);

  return (
    <DialogWrapper
      open={message !== undefined}
      onOpenChange={onOpenChange}
      type={canResend ? "confirm" : "info"}
      title={t(`status.${status?.titleKey ?? "title"}`)}
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
