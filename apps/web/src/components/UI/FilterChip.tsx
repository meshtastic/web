import { cn } from "@core/utils/cn.ts";
import type { ComponentPropsWithoutRef, Ref } from "react";

export type FilterChipProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-pressed"
> & {
  selected: boolean;
  /** Optional count shown after the label. */
  count?: number;
  ref?: Ref<HTMLButtonElement>;
};

/**
 * Toggleable pill for list filters (All / Unread / Favorites, node
 * filters). Selected chips are accent-filled and report `aria-pressed`.
 */
export const FilterChip = ({
  selected,
  count,
  className,
  children,
  type = "button",
  ...props
}: FilterChipProps) => (
  <button
    type={type}
    aria-pressed={selected}
    className={cn(
      "relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-help pointer-coarse:touch-target transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50",
      selected
        ? "bg-accent font-semibold text-on-accent"
        : "bg-raised font-medium text-secondary hover:bg-selected hover:text-primary",
      className,
    )}
    {...props}
  >
    {children}
    {count !== undefined ? (
      <span className="tabular-nums opacity-80">{count}</span>
    ) : null}
  </button>
);
