import { cn } from "@core/utils/cn.ts";
import { useTranslation } from "react-i18next";

/** The quoted message inside a reply's bubble, resolved for display. */
export type ReplyQuoteView =
  | {
      readonly kind: "resolved";
      readonly name: string;
      readonly excerpt: string;
      /** DOM key of the original when it is in the list, to scroll to it. */
      readonly targetKey?: string;
    }
  | { readonly kind: "unavailable" };

export interface ReplyQuoteProps {
  quote: ReplyQuoteView;
  onJump?: (targetKey: string) => void;
}

const quoteBoxClass =
  "block max-w-full rounded border-l-2 border-accent bg-inset px-2 py-0.5 text-left text-meta text-secondary";
const quoteClass = cn(quoteBoxClass, "truncate");

/**
 * "NAME: excerpt" above the reply's text, with an accent rule. Clicking it
 * scrolls to the original when that is loaded; an original that was never
 * received or was pruned is shown unavailable.
 */
export const ReplyQuote = ({ quote, onJump }: ReplyQuoteProps) => {
  const { t } = useTranslation("messages");
  if (quote.kind === "unavailable") {
    return (
      <span className={cn(quoteClass, "italic")}>{t("reply.unavailable")}</span>
    );
  }
  const text = t("reply.quote", { name: quote.name, text: quote.excerpt });
  const targetKey = quote.targetKey;
  if (targetKey && onJump) {
    return (
      <button
        type="button"
        onClick={() => onJump(targetKey)}
        aria-label={`${t("reply.showOriginal", { name: quote.name })}: ${quote.excerpt}`}
        // The text truncates inside, so the button itself doesn't clip
        // its touch hit area.
        className={cn(
          quoteBoxClass,
          "relative cursor-pointer hover:text-primary pointer-coarse:touch-target focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        )}
      >
        <span className="block truncate">{text}</span>
      </button>
    );
  }
  return <span className={quoteClass}>{text}</span>;
};
