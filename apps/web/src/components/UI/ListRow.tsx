import { cn } from "@core/utils/cn.ts";
import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

/**
 * Row look shared by conversation, node and settings lists. Exposed so a
 * router `Link` can take the same classes that the button `ListRow` uses.
 */
export const listRowVariants = cva(
  "flex w-full min-w-0 items-center gap-3 rounded-control p-2.5 text-left text-primary transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
  {
    variants: {
      selected: {
        true: "bg-selected",
        false: "hover:bg-raised/60",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    defaultVariants: { selected: false, interactive: true },
  },
);

export interface ListRowContentProps {
  /** Avatar or icon tile. */
  leading?: ReactNode;
  title: ReactNode;
  /** Right of the title: a timestamp, say. */
  meta?: ReactNode;
  /** Second line: last message preview, role, ... */
  description?: ReactNode;
  /** Right of the description: an unread badge, say. */
  trailing?: ReactNode;
}

/** Two-line layout inside a list row. */
export const ListRowContent = ({
  leading,
  title,
  meta,
  description,
  trailing,
}: ListRowContentProps) => (
  <>
    {leading}
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate font-semibold">{title}</span>
        {meta ? (
          <span className="shrink-0 text-meta whitespace-nowrap text-muted">
            {meta}
          </span>
        ) : null}
      </span>
      {description || trailing ? (
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-help text-muted">{description}</span>
          {trailing}
        </span>
      ) : null}
    </span>
  </>
);

export type ListRowProps = Omit<ComponentPropsWithoutRef<"button">, "title"> &
  ListRowContentProps & {
    selected?: boolean;
    ref?: Ref<HTMLButtonElement>;
  };

/** Selectable list row, rendered with a button element. */
export const ListRow = ({
  leading,
  title,
  meta,
  description,
  trailing,
  selected = false,
  className,
  type = "button",
  ...props
}: ListRowProps) => (
  <button
    type={type}
    aria-current={selected || undefined}
    className={cn(listRowVariants({ selected }), className)}
    {...props}
  >
    <ListRowContent
      leading={leading}
      title={title}
      meta={meta}
      description={description}
      trailing={trailing}
    />
  </button>
);
