import { Button } from "@components/UI/Button.tsx";
import { useCopyToClipboard } from "@core/hooks/useCopyToClipboard.ts";
import { cn } from "@core/utils/cn.ts";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface CopyFieldProps {
  /** The read-only value (node id, public key, channel URL). */
  value: string;
  /** Accessible name for the value, e.g. "Public key". */
  label: string;
  /** Show a copy button. */
  copyable?: boolean;
  /** Further actions after Copy, e.g. Regenerate. */
  actions?: ReactNode;
  className?: string;
}

/** Read-only monospace value with a copy action. */
export const CopyField = ({
  value,
  label,
  copyable = true,
  actions,
  className,
}: CopyFieldProps) => {
  const { t } = useTranslation("ui");
  const { copy, isCopied } = useCopyToClipboard({ timeout: 1500 });
  return (
    <fieldset
      aria-label={label}
      className={cn(
        "m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0",
        className,
      )}
    >
      <code
        title={value}
        className="flex h-10 max-w-[300px] min-w-0 items-center truncate rounded-control border border-input bg-app px-3 font-mono text-help text-secondary"
      >
        <span className="truncate">{value}</span>
      </code>
      {copyable ? (
        <Button
          variant="secondary"
          size="default"
          className="text-help"
          onClick={() => {
            void copy(value);
          }}
          icon={
            isCopied ? (
              <CheckIcon aria-hidden="true" className="size-4 text-accent" />
            ) : (
              <CopyIcon aria-hidden="true" className="size-4" />
            )
          }
        >
          {isCopied
            ? t("notifications.copied.label")
            : t("notifications.copyToClipboard.label")}
        </Button>
      ) : null}
      {actions}
    </fieldset>
  );
};
