/**
 * Reaction choices: the five quick tapbacks on the actions bar (the same
 * set the Android app uses) and a small curated grid behind "More
 * reactions". Plus keyboard movement for the bar and the grid.
 */

export const quickReactions = [
  { emoji: "👍", nameKey: "thumbsUp" },
  { emoji: "❤️", nameKey: "heart" },
  { emoji: "😂", nameKey: "laugh" },
  { emoji: "😮", nameKey: "surprise" },
  { emoji: "‼️", nameKey: "important" },
] as const;

export type QuickReactionName = (typeof quickReactions)[number]["nameKey"];

export const pickerEmoji: readonly string[] = [
  "😀",
  "😄",
  "😁",
  "😅",
  "🤣",
  "😊",
  "😉",
  "😍",
  "😘",
  "😎",
  "🤔",
  "🙄",
  "😴",
  "😢",
  "😭",
  "😡",
  "🤯",
  "🥳",
  "🙏",
  "👏",
  "🙌",
  "👋",
  "💪",
  "🤝",
  "👎",
  "👌",
  "✌️",
  "🤞",
  "🔥",
  "✨",
  "🎉",
  "💯",
  "✅",
  "❌",
  "⚠️",
  "❓",
  "📡",
  "📍",
  "🔋",
  "⛰️",
  "🌧️",
  "☀️",
  "🚗",
  "🏠",
  "☕",
  "🍺",
  "📻",
  "🛰️",
];

export const PICKER_COLUMNS = 8;

/**
 * Next focus in a one-row toolbar (roving tabindex): arrows wrap, Home and
 * End jump. Undefined for keys the toolbar doesn't handle.
 */
export const nextToolbarIndex = (
  current: number,
  key: string,
  count: number,
): number | undefined => {
  if (count <= 0) {
    return undefined;
  }
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return undefined;
  }
};

/**
 * Next focus in a grid laid out in rows of `columns`: left/right move along
 * the reading order, up/down by a row (staying put at an edge).
 */
export const nextGridIndex = (
  current: number,
  key: string,
  columns: number,
  count: number,
): number | undefined => {
  if (count <= 0 || columns <= 0) {
    return undefined;
  }
  const clamp = (i: number) => Math.min(Math.max(i, 0), count - 1);
  switch (key) {
    case "ArrowRight":
      return clamp(current + 1);
    case "ArrowLeft":
      return clamp(current - 1);
    case "ArrowDown":
      return current + columns < count ? current + columns : current;
    case "ArrowUp":
      return current - columns >= 0 ? current - columns : current;
    case "Home":
      return current - (current % columns);
    case "End":
      return clamp(current - (current % columns) + columns - 1);
    default:
      return undefined;
  }
};
