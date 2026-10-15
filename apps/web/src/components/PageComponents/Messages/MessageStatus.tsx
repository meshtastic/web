import { DialogWrapper } from "@components/Dialog/DialogWrapper.tsx";
import { type Message, MessageType } from "@core/stores/messageStore";
import { cn } from "@core/utils/cn.ts";
import {
  type MessageStatusTone,
  messageStatus,
} from "@core/utils/messageStatus.ts";
import { MessageState } from "@core/stores/messageStore";
import { useActiveClient } from "@meshtastic/sdk-react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  CircleEllipsis,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const TONE_CLASS: Record<MessageStatusTone, string> = {
  success: "text-green-600 dark:text-green-500",
  pending: "text-blue-600 dark:text-blue-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
};

function iconFor(message: Message, isDirect: boolean): LucideIcon {
  const status = messageStatus(message, isDirect);
  if (status.proofKey === "failed") return ShieldAlert;
  switch (message.state) {
    case MessageState.Ack:
      return CheckCheck;
    case MessageState.Delivered:
      return isDirect ? TriangleAlert : CheckCircle2;
    case MessageState.Waiting:
      return CircleEllipsis;
    default:
      return AlertCircle;
  }
}

interface MessageStatusProps {
  message: Message;
}

/**
 * One-line delivery status under an outbound message, after the Android
 * app's MessageStatusLabel. Clicking it opens the details, with Resend when
 * sending again can help.
 */
export const MessageStatus = ({ message }: MessageStatusProps) => {
  const { t } = useTranslation("messages");
  const [open, setOpen] = useState(false);
  const isDirect = message.type === MessageType.Direct;
  const status = messageStatus(message, isDirect);
  const Icon = iconFor(message, isDirect);
  const text = t(`status.${status.textKey}`);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${t("status.showDetails")}: ${text}`}
        className={cn(
          "flex items-center gap-1 text-xs w-fit rounded-sm",
          "hover:underline focus-visible:outline-2 focus-visible:outline-offset-2",
          TONE_CLASS[status.tone],
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{text}</span>
      </button>
      <MessageStatusDialog
        message={message}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
};

interface MessageStatusDialogProps {
  message: Message;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MessageStatusDialog = ({
  message,
  open,
  onOpenChange,
}: MessageStatusDialogProps) => {
  const { t } = useTranslation("messages");
  const client = useActiveClient();
  const isDirect = message.type === MessageType.Direct;
  const status = messageStatus(message, isDirect);
  const canResend = status.retryable && !!client;

  const resend = async () => {
    await client?.chat.resend({
      id: message.messageId,
      text: message.message,
      to: message.to,
      channel: message.channel,
      type: isDirect ? "direct" : "broadcast",
    });
    onOpenChange(false);
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type={canResend ? "confirm" : "info"}
      title={t(`status.${status.titleKey}`)}
      confirmText={t("status.resend")}
      cancelText={t("status.close")}
      dismissText={t("status.close")}
      onConfirm={canResend ? resend : undefined}
    >
      <div className="flex flex-col gap-2 text-sm text-center">
        <p>{t(`status.${status.textKey}`)}</p>
        {status.detailKey && <p>{t(`status.detail.${status.detailKey}`)}</p>}
        {(message.relays ?? 0) > 0 && (
          <p>{t("status.relays", { count: message.relays })}</p>
        )}
        {status.proofKey && (
          <div
            className={cn(
              "flex flex-col gap-0.5",
              status.proofKey === "failed"
                ? TONE_CLASS.error
                : status.proofKey === "verified"
                  ? TONE_CLASS.success
                  : undefined,
            )}
          >
            <p className="font-medium">
              {t(`status.proof.${status.proofKey}`)}
            </p>
            <p>{t(`status.proof.${status.proofKey}Info`)}</p>
          </div>
        )}
      </div>
    </DialogWrapper>
  );
};
