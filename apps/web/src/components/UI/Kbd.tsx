import { cn } from "@core/utils/cn.ts";
import type { ComponentPropsWithoutRef } from "react";

/** A keyboard shortcut hint, e.g. ⌘K or esc. */
export const Kbd = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"kbd">) => (
  <kbd
    className={cn(
      "inline-flex h-5 shrink-0 items-center rounded-md border border-input px-1.5 font-sans text-meta text-muted",
      className,
    )}
    {...props}
  />
);
