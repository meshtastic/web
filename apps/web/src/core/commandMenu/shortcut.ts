/** The key event fields the open shortcut cares about. */
export interface ShortcutKeyEvent {
  readonly key: string;
  /** Physical key; keeps ⌘K working on non-Latin layouts. */
  readonly code: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

const LATIN_LETTER = /^[a-z]$/iu;

/**
 * The typed key is K; on layouts without Latin letters (Cyrillic, Greek,
 * ...) the physical K key counts instead. Latin layouts such as Dvorak keep
 * their own K so ⌘ + whatever sits on that key is left alone.
 */
const isK = ({ key, code }: ShortcutKeyEvent): boolean =>
  key.toLowerCase() === "k" || (!LATIN_LETTER.test(key) && code === "KeyK");

/** ⌘K on macOS, Ctrl+K elsewhere (either is accepted everywhere). */
export const isCommandMenuShortcut = (event: ShortcutKeyEvent): boolean =>
  isK(event) &&
  (event.metaKey || event.ctrlKey) &&
  !event.altKey &&
  !event.shiftKey;

/** Apple platforms label the modifier ⌘; everything else says Ctrl. */
export const isApplePlatform = (platform: string): boolean =>
  /mac|iphone|ipad|ipod/iu.test(platform);

/**
 * How to show the open shortcut in hints and help text. `ctrlLabel` is the
 * localised name of the Control key.
 */
export const commandMenuShortcutLabel = (
  platform: string,
  ctrlLabel: string,
): string => (isApplePlatform(platform) ? "⌘K" : `${ctrlLabel} K`);
