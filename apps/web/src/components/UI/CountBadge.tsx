import { cn } from "@core/utils/cn.ts";
import type { ComponentPropsWithoutRef } from "react";
import { useTranslation } from "react-i18next";

export type CountBadgeProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> & {
  count: number;
  /** Counts above this show as `max+`. */
  max?: number;
  /**
   * Accessible text. Defaults to "N unread messages"; pass `null` when the
   * surrounding control already states the count.
   */
  label?: string | null;
  size?: "sm" | "md";
};

/** Accent pill with an unread count. Renders nothing for zero. */
export const CountBadge = ({
  count,
  max = 99,
  label,
  size = "md",
  className,
  ...props
}: CountBadgeProps) => {
  const { t } = useTranslation("ui");
  if (count <= 0) {
    return null;
  }
  const shown = count > max ? `${max}+` : String(count);
  const accessible =
    label === undefined ? t("primitives.unread", { count }) : label;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-on-accent tabular-nums text-meta leading-none",
        size === "md" ? "h-5 min-w-5 px-1.5" : "h-4 min-w-4 px-1",
        className,
      )}
      {...props}
    >
      <span aria-hidden={accessible === null ? undefined : true}>{shown}</span>
      {accessible === null ? null : (
        <span className="sr-only">{accessible}</span>
      )}
    </span>
  );
};
