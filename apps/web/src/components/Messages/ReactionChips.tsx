import type { ReactionChip } from "@core/messaging/reactions.ts";
import { MessageState } from "@core/storage/types.ts";
import { cn } from "@core/utils/cn.ts";
import { RotateCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface ReactionChipsProps {
  chips: readonly ReactionChip[];
  /** Right-aligned under an outgoing bubble. */
  align: "start" | "end";
  /** Adds or removes my reaction; omitted while disconnected. */
  onToggle?: (emoji: string) => void;
  /** Sends my failed reaction again by its packet id. */
  onRetry?: (packetId: number) => void;
}

/**
 * One chip per emoji with how many nodes sent it. Mine is outlined in
 * accent and toggles off on click; while it is being sent it is dimmed, and
 * if it failed it is outlined in red with a retry button beside it.
 */
export const ReactionChips = ({
  chips,
  align,
  onToggle,
  onRetry,
}: ReactionChipsProps) => {
  const { t } = useTranslation("messages");
  if (chips.length === 0) {
    return null;
  }
  return (
    <ul
      aria-label={t("reactions.label")}
      className={cn(
        "m-0 flex list-none flex-wrap gap-1 p-0",
        align === "end" && "justify-end",
      )}
    >
      {chips.map((chip) => {
        const pending = chip.own?.state === MessageState.Pending;
        const failed = chip.own?.state === MessageState.Failed;
        const label = chip.mine
          ? t("reactions.chipMine", { emoji: chip.emoji, count: chip.count })
          : t("reactions.chip", { emoji: chip.emoji, count: chip.count });
        const status = failed
          ? t("reactions.failed")
          : pending
            ? t("reactions.sending")
            : undefined;
        const own = chip.own;
        return (
          <li key={chip.emoji} className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={chip.mine}
              aria-label={status ? `${label}. ${status}` : label}
              disabled={!onToggle}
              onClick={() => onToggle?.(chip.emoji)}
              className={cn(
                "inline-flex h-[26px] cursor-pointer items-center gap-1 rounded-full border px-2 text-meta font-medium text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default",
                chip.mine
                  ? "border-accent bg-accent-tint"
                  : "border-control bg-inset hover:border-input",
                failed && "border-danger-strong",
                pending && "opacity-70",
              )}
            >
              <span aria-hidden="true">{chip.emoji}</span>
              <span aria-hidden="true" className="tabular-nums">
                {chip.count}
              </span>
            </button>
            {failed && own && onRetry ? (
              <button
                type="button"
                aria-label={t("reactions.retry", { emoji: chip.emoji })}
                onClick={() => onRetry(own.packetId)}
                className="inline-flex size-[26px] cursor-pointer items-center justify-center rounded-full text-danger hover:bg-danger hover:text-on-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <RotateCwIcon aria-hidden="true" className="size-3.5" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};
