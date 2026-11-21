import type { DeliveryLine } from "@core/messaging/deliveryView.ts";
import { cn } from "@core/utils/cn.ts";
import {
  AlertCircleIcon,
  CheckCheckIcon,
  Clock3Icon,
  ShieldAlertIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export interface DeliveryStatusProps {
  line: DeliveryLine;
  /** Opens the delivery details dialog. */
  onShowDetails: () => void;
  /** Sends the message again; omitted when retrying can't help or there's no connection. */
  onRetry?: () => void;
}

const iconClass = "size-3.5 shrink-0";

/**
 * The delivery half of an outgoing bubble's meta line: Delivered (double
 * tick), Heard by N nodes, Waiting for acknowledgement (clock), or Not
 * delivered in red with Retry. The text opens the details dialog.
 */
export const DeliveryStatus = ({
  line,
  onShowDetails,
  onRetry,
}: DeliveryStatusProps) => {
  const { t } = useTranslation("messages");
  const text = (() => {
    switch (line.kind) {
      case "delivered":
        return line.proven
          ? t("bubble.deliveredProven")
          : t("bubble.delivered");
      case "proofFailed":
        return t("status.ackProofInvalid");
      case "heardBy":
        return t("bubble.heardBy", { count: line.count });
      case "pending":
        return line.relayed ? t("bubble.relayedWaiting") : t("bubble.waiting");
      case "failed":
        return line.reasonKey
          ? t("bubble.notDeliveredReason", {
              reason: t(`status.${line.reasonKey}`),
            })
          : t("bubble.notDelivered");
    }
  })();
  const icon =
    line.kind === "failed" ? (
      <AlertCircleIcon aria-hidden="true" className={iconClass} />
    ) : line.kind === "proofFailed" ? (
      <ShieldAlertIcon aria-hidden="true" className={iconClass} />
    ) : line.kind === "pending" ? (
      <Clock3Icon aria-hidden="true" className={iconClass} />
    ) : (
      <CheckCheckIcon
        aria-hidden="true"
        className={cn(iconClass, "text-accent")}
      />
    );

  return (
    <>
      <button
        type="button"
        onClick={onShowDetails}
        title={t("bubble.deliveryDetails")}
        className={cn(
          "inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md text-meta hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          line.kind === "failed"
            ? "text-danger"
            : line.kind === "proofFailed"
              ? "text-warning"
              : "text-muted",
        )}
      >
        {line.kind === "failed" ||
        line.kind === "pending" ||
        line.kind === "proofFailed"
          ? icon
          : null}
        <span className="truncate">{text}</span>
        {line.kind === "delivered" || line.kind === "heardBy" ? icon : null}
      </button>
      {line.kind === "failed" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-[26px] shrink-0 cursor-pointer items-center rounded-full border border-danger bg-danger px-2.5 text-meta font-semibold text-on-danger hover:border-danger-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t("bubble.retry")}
        </button>
      ) : null}
    </>
  );
};
