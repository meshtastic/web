/**
 * Shared look for segmented controls (Tabs, ToggleGroup): a light grey
 * track whose selected segment is a solid grey that fills it edge to edge.
 * Covers both Radix selected states: `active` (Tabs) and `on` (ToggleGroup).
 */
export const segmentedTrackClasses =
  "overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-100";

export const segmentedItemClasses = [
  "rounded-none text-sm font-medium text-neutral-600 transition-colors cursor-pointer",
  "hover:bg-neutral-300/60 hover:text-neutral-900",
  "disabled:pointer-events-none disabled:opacity-50",
  // Selected: white on mid grey; black on a lighter grey in dark mode.
  "data-[state=active]:bg-neutral-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:bg-neutral-600",
  "dark:data-[state=active]:bg-neutral-400 dark:data-[state=active]:text-black dark:data-[state=active]:hover:bg-neutral-400 dark:data-[state=active]:hover:text-black",
  "data-[state=on]:bg-neutral-600 data-[state=on]:text-white data-[state=on]:shadow-sm data-[state=on]:hover:bg-neutral-600",
  "dark:data-[state=on]:bg-neutral-400 dark:data-[state=on]:text-black dark:data-[state=on]:hover:bg-neutral-400 dark:data-[state=on]:hover:text-black",
].join(" ");
