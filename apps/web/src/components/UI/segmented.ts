/**
 * Shared look for segmented controls (Tabs, ToggleGroup, Segmented): an
 * inset track whose selected segment is an accent pill. Covers the Radix
 * selected states `active` (Tabs) and `on` (ToggleGroup), and
 * `aria-checked` (Segmented's radios).
 */
export const segmentedTrackClasses =
  "gap-0.5 rounded-control border border-input bg-app p-[3px]";

export const segmentedItemClasses = [
  "rounded-[7px] text-help font-semibold text-secondary transition-colors cursor-pointer",
  "hover:bg-raised hover:text-primary",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
  "disabled:pointer-events-none disabled:opacity-50",
  "data-[state=active]:bg-accent data-[state=active]:text-on-accent data-[state=active]:hover:bg-accent",
  "data-[state=on]:bg-accent data-[state=on]:text-on-accent data-[state=on]:hover:bg-accent",
  "aria-checked:bg-accent aria-checked:text-on-accent aria-checked:hover:bg-accent",
].join(" ");
