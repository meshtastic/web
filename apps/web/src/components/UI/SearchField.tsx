import { Kbd } from "@components/UI/Kbd.tsx";
import { cn } from "@core/utils/cn.ts";
import { SearchIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, Ref } from "react";

export type SearchFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "aria-label"
> & {
  /** Accessible name, also the default placeholder. */
  label: string;
  /** Shortcut hint shown at the end, e.g. "⌘K". */
  shortcut?: string;
  containerClassName?: string;
  ref?: Ref<HTMLInputElement>;
};

/** Search box with a leading icon and optional shortcut hint. */
export const SearchField = ({
  label,
  shortcut,
  placeholder,
  className,
  containerClassName,
  ...props
}: SearchFieldProps) => (
  <label
    className={cn(
      "flex h-10 items-center gap-2 rounded-control border border-input bg-app px-3 text-muted focus-within:border-accent pointer-coarse:h-11",
      containerClassName,
    )}
  >
    <SearchIcon aria-hidden="true" className="size-4 shrink-0" />
    <input
      type="search"
      aria-label={label}
      placeholder={placeholder ?? label}
      className={cn(
        "min-w-0 flex-1 border-0 bg-transparent text-body text-primary outline-none placeholder:text-muted pointer-coarse:text-base",
        className,
      )}
      {...props}
    />
    {shortcut ? <Kbd aria-hidden="true">{shortcut}</Kbd> : null}
  </label>
);
