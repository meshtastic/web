import { Button } from "@components/UI/Button.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { createLogger } from "@core/log.ts";
import { Share2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface ShareButtonProps {
  /** The link to hand to the system share sheet. */
  url: string;
  /** Title the share sheet may show with the link. */
  title?: string;
  className?: string;
}

const log = createLogger("share");

const canShare = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * Opens the system share sheet (Web Share API) for a link. Renders nothing
 * where the browser has no share sheet; copying the link covers those.
 */
export const ShareButton = ({ url, title, className }: ShareButtonProps) => {
  const { t } = useTranslation("ui");
  const { toast } = useToast();
  if (!canShare()) return null;
  return (
    <Button
      variant="secondary"
      className={className ?? "text-help"}
      icon={<Share2Icon aria-hidden="true" className="size-4" />}
      onClick={() => {
        navigator.share({ title, url }).catch((error: unknown) => {
          // Closing the share sheet rejects with AbortError: not a failure.
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          const message =
            error instanceof Error ? error.message : String(error);
          log.warn("share failed", { error: message });
          toast({
            title: t("primitives.shareFailed", { message }),
            variant: "destructive",
          });
        });
      }}
    >
      {t("primitives.share")}
    </Button>
  );
};
