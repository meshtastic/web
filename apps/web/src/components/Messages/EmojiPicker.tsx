import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { SearchField } from "@components/UI/SearchField.tsx";
import {
  categoryKey,
  type Emoji,
  emojiName,
  SKIN_TONE_COUNT,
  searchEmoji,
  withSkinTone,
} from "@core/emoji/catalog.ts";
import {
  nextGridIndex,
  nextToolbarIndex,
  PICKER_COLUMNS,
} from "@core/messaging/emojiPicker.ts";
import { cn } from "@core/utils/cn.ts";
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  type EmojiCatalogState,
  type EmojiPrefs,
  useEmojiCatalog,
} from "./useEmoji.ts";

export type EmojiPickSource = "quick" | "grid";

/** Search results shown at once: enough to scan, few enough to stay quick. */
const MAX_RESULTS = 160;

const TONE_PREVIEW = { base: "👋", supportsSkinTone: true } as const;

const cellClass =
  "flex aspect-square min-w-0 cursor-pointer items-center justify-center rounded-lg text-title leading-none hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";

export interface EmojiPickerProps {
  catalog: EmojiCatalogState;
  onRetry: () => void;
  /** The quick row's emoji, as they'll be sent. */
  quick: readonly string[];
  /** Heading over the quick row, e.g. "Frequently used". */
  quickLabel: string;
  skinTone: number;
  onSkinToneChange: (index: number) => void;
  onPick: (emoji: string, source: EmojiPickSource) => void;
  /** Shown above the quick row (the tapback switch). */
  header?: ReactNode;
  /** A message about the last pick, e.g. no room for it. */
  notice?: string;
  /** Focus the search box when it appears (not on touch: no keyboard pop-up). */
  autoFocusSearch?: boolean;
}

/** One row of buttons with a single tab stop; arrows move along it. */
const useRovingRow = (count: number) => {
  const [focused, setFocused] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.min(focused, Math.max(count - 1, 0));
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextToolbarIndex(current, event.key, count);
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    setFocused(next);
    refs.current[next]?.focus();
  };
  const itemProps = (index: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current[index] = el;
    },
    tabIndex: index === current ? 0 : -1,
    onFocus: () => setFocused(index),
    onKeyDown,
  });
  return { itemProps };
};

/**
 * The emoji picker's content: quick row, search, category tabs, the grid
 * and a skin-tone choice. The grid shows one category (or the search
 * results) at a time, at most a few hundred cells, so it needs no
 * windowing. Arrow keys move through it with one tab stop; Enter picks.
 * Until the catalog arrives the quick row works on its own.
 */
export const EmojiPicker = ({
  catalog,
  onRetry,
  quick,
  quickLabel,
  skinTone,
  onSkinToneChange,
  onPick,
  header,
  notice,
  autoFocusSearch = false,
}: EmojiPickerProps) => {
  const { t } = useTranslation("messages");
  const toneName = useId();
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(0);
  const [focused, setFocused] = useState(0);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const ready = catalog.status === "ready" ? catalog.catalog : undefined;

  const nameOf = (emoji: string) => (ready ? emojiName(ready, emoji) : emoji);
  const categoryLabel = (name: string) => {
    const key = categoryKey(name);
    return key ? t(`emojiPicker.category${key}`) : name;
  };

  const searching = query.trim() !== "";
  const shown: readonly Emoji[] = useMemo(() => {
    if (!ready) {
      return [];
    }
    if (searching) {
      return searchEmoji(ready, query, quick).slice(0, MAX_RESULTS);
    }
    return ready.categories[category]?.emojis ?? [];
  }, [ready, searching, query, quick, category]);
  const current = Math.min(focused, Math.max(shown.length - 1, 0));

  const quickRow = useRovingRow(quick.length);
  const tabs = useRovingRow(ready?.categories.length ?? 0);

  // Into the search box once the catalog is there (with a keyboard).
  const isReady = ready !== undefined;
  useEffect(() => {
    if (autoFocusSearch && isReady) {
      search.current?.focus();
    }
  }, [autoFocusSearch, isReady]);

  const focusCell = (index: number) => {
    setFocused(index);
    cells.current[index]?.focus();
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextGridIndex(
      current,
      event.key,
      PICKER_COLUMNS,
      shown.length,
    );
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    focusCell(next);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const first = shown[0];
    if (event.key === "Enter" && searching && first) {
      event.preventDefault();
      onPick(withSkinTone(first, skinTone), "grid");
    } else if (event.key === "ArrowDown" && shown.length > 0) {
      event.preventDefault();
      focusCell(0);
    }
  };

  const selectCategory = (index: number) => {
    setCategory(index);
    setFocused(0);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      {header}
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1.5 p-0 text-meta font-semibold text-secondary">
          {quickLabel}
        </legend>
        <div className="grid grid-cols-6 gap-1">
          {quick.map((emoji, i) => (
            <button
              key={emoji}
              type="button"
              {...quickRow.itemProps(i)}
              aria-label={nameOf(emoji)}
              onClick={() => onPick(emoji, "quick")}
              className={cn(
                cellClass,
                "size-11 justify-self-center rounded-full bg-raised hover:bg-inset",
              )}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {catalog.status === "loading" ? (
        <output className="flex h-48 items-center justify-center text-help text-muted">
          {t("emojiPicker.loading")}
        </output>
      ) : catalog.status === "error" ? (
        <div
          role="alert"
          className="flex h-48 flex-col items-center justify-center gap-3 text-center"
        >
          <p className="m-0 text-help text-secondary">
            {t("emojiPicker.loadFailed")}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="relative h-9 cursor-pointer rounded-control border border-control bg-surface px-3 text-body text-primary pointer-coarse:touch-target hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t("button.retry", { ns: "common" })}
          </button>
        </div>
      ) : (
        <>
          <SearchField
            ref={search}
            label={t("emojiPicker.search")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setFocused(0);
            }}
            onKeyDown={onSearchKeyDown}
          />
          {searching ? null : (
            <fieldset className="m-0 flex min-w-0 justify-between gap-0.5 border-0 p-0">
              <legend className="sr-only">{t("emojiPicker.categories")}</legend>
              {ready?.categories.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  {...tabs.itemProps(i)}
                  aria-label={categoryLabel(c.name)}
                  aria-pressed={i === category}
                  onClick={() => selectCategory(i)}
                  className={cn(
                    "relative flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg border-b-2 border-transparent text-header leading-none pointer-coarse:touch-target hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
                    i === category && "border-accent bg-raised",
                  )}
                >
                  <span aria-hidden="true">{c.icon}</span>
                </button>
              ))}
            </fieldset>
          )}
          <div className="h-60 overflow-y-auto overscroll-contain">
            {shown.length === 0 ? (
              <p className="m-0 py-8 text-center text-help text-muted">
                {t("emojiPicker.noResults")}
              </p>
            ) : (
              <fieldset className="m-0 grid min-w-0 grid-cols-8 gap-0.5 border-0 p-0 pointer-coarse:gap-0">
                <legend className="sr-only">
                  {searching
                    ? t("emojiPicker.results")
                    : categoryLabel(ready?.categories[category]?.name ?? "")}
                </legend>
                {shown.map((emoji, i) => {
                  const value = withSkinTone(emoji, skinTone);
                  return (
                    <button
                      key={emoji.base}
                      ref={(el) => {
                        cells.current[i] = el;
                      }}
                      type="button"
                      tabIndex={i === current ? 0 : -1}
                      aria-label={nameOf(emoji.base)}
                      onFocus={() => setFocused(i)}
                      onKeyDown={onGridKeyDown}
                      onClick={() => onPick(value, "grid")}
                      className={cellClass}
                    >
                      <span aria-hidden="true">{value}</span>
                    </button>
                  );
                })}
              </fieldset>
            )}
          </div>
          <fieldset className="m-0 flex min-w-0 items-center gap-1 border-0 p-0">
            <legend className="sr-only">{t("emojiPicker.skinTone")}</legend>
            <span aria-hidden="true" className="mr-auto text-meta text-muted">
              {t("emojiPicker.skinTone")}
            </span>
            {Array.from({ length: SKIN_TONE_COUNT }, (_, i) => (
              <label
                key={i}
                className={cn(
                  "relative flex size-8 cursor-pointer items-center justify-center rounded-full text-body leading-none pointer-coarse:touch-target hover:bg-raised has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-focus",
                  i === skinTone && "bg-accent-tint ring-2 ring-accent",
                )}
              >
                <input
                  type="radio"
                  name={toneName}
                  value={i}
                  checked={i === skinTone}
                  onChange={() => onSkinToneChange(i)}
                  aria-label={t(`emojiPicker.tone${i}`)}
                  className="sr-only"
                />
                <span aria-hidden="true">{withSkinTone(TONE_PREVIEW, i)}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      {notice ? (
        <output className="text-help text-danger">{notice}</output>
      ) : null}
    </div>
  );
};

type ContentProps = ComponentPropsWithoutRef<typeof PopoverContent>;

export interface EmojiPickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name of the picker dialog. */
  label: string;
  prefs: EmojiPrefs;
  /** Heading over the quick row; "Frequently used" by default. */
  quickLabel?: string;
  header?: ReactNode;
  notice?: string;
  /**
   * An emoji was picked. Return false to refuse it (it isn't counted);
   * the caller closes the picker when it's done with it.
   */
  onPick: (emoji: string, source: EmojiPickSource) => boolean;
  /** The trigger button (rendered asChild). */
  children: ReactNode;
  align?: ContentProps["align"];
  side?: ContentProps["side"];
  onCloseAutoFocus?: ContentProps["onCloseAutoFocus"];
}

const prefersTouch = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

/**
 * The emoji picker in a popover on its trigger. The catalog loads the
 * first time it opens; every pick inside it counts toward the quick row
 * (as the Android picker counts them); Esc closes it with focus back on
 * the trigger. Nearly full width on a phone.
 */
export const EmojiPickerPopover = ({
  open,
  onOpenChange,
  label,
  prefs,
  quickLabel,
  header,
  notice,
  onPick,
  children,
  align = "end",
  side = "top",
  onCloseAutoFocus,
}: EmojiPickerPopoverProps) => {
  const { t } = useTranslation("messages");
  const { state, retry } = useEmojiCatalog(open);
  const content = useRef<HTMLDivElement>(null);
  const touch = prefersTouch();
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        ref={content}
        aria-label={label}
        tabIndex={-1}
        align={align}
        side={side}
        collisionPadding={8}
        // A phone's 8 columns need the width for 44px cells.
        className="w-[calc(100vw-1rem)] p-3 pointer-coarse:px-2 md:w-[22rem]"
        // Into the search box with a keyboard; on touch the dialog itself,
        // so no on-screen keyboard covers the grid.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const el = content.current;
          const search =
            el?.querySelector<HTMLInputElement>("input[type=search]");
          (touch ? el : (search ?? el))?.focus();
        }}
        {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}
      >
        <EmojiPicker
          catalog={state}
          onRetry={retry}
          quick={prefs.quick}
          quickLabel={quickLabel ?? t("emojiPicker.frequent")}
          skinTone={prefs.skinTone}
          onSkinToneChange={prefs.setSkinTone}
          header={header}
          {...(notice ? { notice } : {})}
          autoFocusSearch={!touch}
          onPick={(emoji, source) => {
            if (onPick(emoji, source)) {
              prefs.recordUse(emoji);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
