import { cn } from "@core/utils/cn.ts";
import { nextRovingIndex } from "@core/utils/rovingFocus.ts";
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useRef,
} from "react";
import { segmentedItemClasses, segmentedTrackClasses } from "./segmented.ts";

// Segments are buttons with role="radio": native radio inputs can't be
// styled like segments without hiding them.
/* oxlint-disable jsx-a11y/prefer-tag-over-role */

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  /** Accessible name when `label` is not plain text (an icon, say). */
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
}

/** A radio group needs a name: give `aria-label` or `aria-labelledby`. */
export type GroupLabel =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

/**
 * `T` is inferred from `options` alone (`NoInfer` on `value` and the
 * callback), so a `value` outside the options is a type error and the
 * callback receives the option union, not `string`.
 */
export type SegmentedProps<T extends string> = Omit<
  ComponentPropsWithoutRef<"div">,
  "onChange" | "defaultValue" | "role" | "aria-label" | "aria-labelledby"
> &
  GroupLabel & {
    options: readonly SegmentedOption<T>[];
    value: NoInfer<T>;
    onValueChange: (value: NoInfer<T>) => void;
    /** Unsaved edit: amber track border. */
    dirty?: boolean;
    disabled?: boolean;
    size?: "sm" | "md";
    ref?: Ref<HTMLDivElement>;
  };

/**
 * Single-choice segmented control (radio group). Arrow keys move the
 * selection with wrap-around, Home/End jump to the ends, and only the
 * selected segment is in the tab order.
 */
export const Segmented = <T extends string>({
  options,
  value,
  onValueChange,
  dirty = false,
  disabled = false,
  size = "md",
  className,
  onKeyDown,
  ...props
}: SegmentedProps<T>) => {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const isDisabled = (option: SegmentedOption<T>) =>
    disabled || option.disabled === true;
  const firstEnabled = options.findIndex((o) => !isDisabled(o));
  const selectedOption = options[selectedIndex];
  const tabStop =
    selectedOption !== undefined && !isDisabled(selectedOption)
      ? selectedIndex
      : firstEnabled;

  const disabledSet = new Set(
    options.flatMap((option, index) => (isDisabled(option) ? [index] : [])),
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    // Move from the segment that has focus, which can differ from the tab
    // stop (e.g. after a click on a segment the parent didn't select).
    const focused = buttons.current.findIndex(
      (button) => button !== null && button === event.target,
    );
    const next = nextRovingIndex(
      focused >= 0 ? focused : Math.max(tabStop, 0),
      event.key,
      options.length,
      // Up/Down move too, like native radio groups.
      { disabled: disabledSet, orientation: "both" },
    );
    const option = next === null ? undefined : options[next];
    if (next === null || option === undefined) {
      return;
    }
    event.preventDefault();
    buttons.current[next]?.focus();
    if (option.value !== value) {
      onValueChange(option.value);
    }
  };

  return (
    // The group itself is not a tab stop: focus roves between its radios
    // (WAI-ARIA radio group pattern).
    // oxlint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      role="radiogroup"
      aria-disabled={disabled || undefined}
      className={cn(
        "inline-flex",
        segmentedTrackClasses,
        dirty && "border-dirty",
        className,
      )}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {options.map((option, index) => {
        const checked = index === selectedIndex;
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            disabled={isDisabled(option)}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => {
              if (!checked) {
                onValueChange(option.value);
              }
            }}
            className={cn(
              segmentedItemClasses,
              "inline-flex items-center justify-center",
              size === "md" ? "h-8 min-w-9 px-2.5" : "h-7 min-w-8 px-2",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
