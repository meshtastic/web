import { Kbd } from "@components/UI/Kbd.tsx";
import { cn } from "@core/utils/cn.ts";
import { SearchIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { useTranslation } from "react-i18next";

export type SearchTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> & {
  /** Visible prompt, e.g. "Search chats, nodes, settings". */
  label: string;
  /** Shortcut that opens the same thing, e.g. "⌘K". */
  shortcut?: string;
  ref?: Ref<HTMLButtonElement>;
};

/**
 * Looks like a search field but opens something (the command menu). Used
 * where typing happens in an overlay rather than in place.
 */
export const SearchTrigger = ({
  label,
  shortcut,
  className,
  type = "button",
  ...props
}: SearchTriggerProps) => {
  const { t } = useTranslation("ui");
  return (
    <button
      type={type}
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-control border border-input bg-app px-3 text-body text-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className,
      )}
      {...props}
    >
      <SearchIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {shortcut ? (
        <Kbd>
          <span aria-hidden="true">{shortcut}</span>
          <span className="sr-only">
            {t("primitives.shortcut", { keys: shortcut })}
          </span>
        </Kbd>
      ) : null}
    </button>
  );
};
