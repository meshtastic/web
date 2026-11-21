import { cn } from "@core/utils/cn.ts";
import {
  evaluateTextLimit,
  type TextLimitSpec,
} from "@core/utils/textLimit.ts";
import { useTranslation } from "react-i18next";

export interface LimitCounterProps {
  value: string;
  limit: TextLimitSpec;
  /** Id for the full description, to reference from aria-describedby. */
  id?: string;
  className?: string;
}

/**
 * `used/max` counter for length-limited text. Counts UTF-8 bytes or
 * characters per `limit.mode`, turns danger-red once over, and announces
 * only the moment it goes over (not every keystroke).
 */
export const LimitCounter = ({
  value,
  limit,
  id,
  className,
}: LimitCounterProps) => {
  const { t } = useTranslation("ui");
  const { used, over } = evaluateTextLimit(value, limit);
  const description = t(
    limit.mode === "bytes" ? "primitives.bytesUsed" : "primitives.charsUsed",
    { used, limit: limit.max },
  );
  return (
    <span
      className={cn(
        "text-meta tabular-nums",
        over ? "text-danger" : "text-muted",
        className,
      )}
      data-over={over || undefined}
    >
      <span aria-hidden="true">
        {used}/{limit.max}
      </span>
      <span id={id} className="sr-only">
        {description}
      </span>
      <output className="sr-only">
        {over ? t("primitives.overLimit") : ""}
      </output>
    </span>
  );
};
