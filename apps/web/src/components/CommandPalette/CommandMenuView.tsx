import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@components/UI/Command.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { Kbd } from "@components/UI/Kbd.tsx";
import { flattenResults, type ResultGroup } from "@core/commandMenu/results.ts";
import type {
  Command,
  CommandGroupId,
  CommandPageId,
} from "@core/commandMenu/types.ts";
import { ArrowLeftIcon, PinIcon } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CommandRow } from "./CommandRow.tsx";

export interface CommandMenuViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  groups: ReadonlyArray<ResultGroup>;
  /** A picker replacing the main list, or null for the main list. */
  page: CommandPageId | null;
  onBack: () => void;
  /** Pinned groups, marked in their heading (toggled via pin commands). */
  pinned: ReadonlyArray<CommandGroupId>;
  onSelect: (command: Command) => void;
  /** See `CommandDialog`. */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * The command menu overlay. Purely presentational: results arrive ranked
 * and grouped; choosing one calls `onSelect`.
 */
export const CommandMenuView = ({
  open,
  onOpenChange,
  query,
  onQueryChange,
  groups,
  page,
  onBack,
  pinned,
  onSelect,
  onCloseAutoFocus,
}: CommandMenuViewProps) => {
  const { t } = useTranslation("commandPalette");
  const resultCount = flattenResults(groups).length;
  const inputRef = useRef<HTMLInputElement>(null);

  // Entering or leaving a picker unmounts the button that was pressed;
  // keep typing and arrow keys working by returning focus to the field.
  useEffect(() => {
    inputRef.current?.focus();
  }, [page]);

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (page !== null && event.key === "Backspace" && query === "") {
      event.preventDefault();
      onBack();
    }
  };

  const placeholder =
    page === "traceroute"
      ? t("search.pickNode")
      : page === "switchDevice"
        ? t("search.pickDevice")
        : t("search.placeholder");

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title={t("page.title")}
      commandProps={{
        shouldFilter: false,
        loop: true,
        label: t("search.label"),
      }}
    >
      <CommandInput
        ref={inputRef}
        value={query}
        onValueChange={onQueryChange}
        onKeyDown={onInputKeyDown}
        placeholder={placeholder}
        leading={
          page === null ? undefined : (
            <IconButton
              aria-label={t("pages.back")}
              icon={<ArrowLeftIcon className="size-[18px]" />}
              size="sm"
              className="-ml-1.5 max-md:-ml-2.5 max-md:size-11"
              onClick={onBack}
            />
          )
        }
        trailing={
          <>
            <Kbd aria-hidden="true" className="max-md:hidden">
              {t("keys.esc")}
            </Kbd>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mr-2 h-11 shrink-0 cursor-pointer rounded-control px-2 text-body font-medium text-accent focus-visible:outline-2 focus-visible:outline-focus md:hidden"
            >
              {t("button.cancel", { ns: "common" })}
            </button>
          </>
        }
      />
      {page === null ? null : (
        <div className="border-b border-subtle px-4 py-2 text-meta font-semibold tracking-[0.06em] text-muted uppercase">
          {t(`pages.${page}`)}
        </div>
      )}
      <CommandList className="max-md:max-h-none max-md:flex-1">
        <CommandEmpty>{t("emptyState")}</CommandEmpty>
        {groups.map((group) => {
          const isPinned = page === null && pinned.includes(group.id);
          return (
            <CommandGroup
              key={group.id}
              heading={
                <span className="flex items-center gap-1.5">
                  {t(`groups.${group.id}`)}
                  {isPinned ? (
                    <PinIcon
                      aria-hidden="true"
                      className="size-3 fill-current text-accent"
                    />
                  ) : null}
                </span>
              }
            >
              {group.commands.map((command) => (
                <CommandRow
                  key={command.id}
                  command={command}
                  onSelect={onSelect}
                />
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      <output className="sr-only">
        {t("results", { count: resultCount })}
      </output>
      <div className="flex h-10 shrink-0 items-center gap-4 border-t border-subtle px-4 text-meta text-muted max-md:hidden">
        <span>{t("footer.move")}</span>
        <span>{t("footer.open")}</span>
        <span>
          {page === null ? t("footer.commandsOnly") : t("footer.back")}
        </span>
      </div>
    </CommandDialog>
  );
};
