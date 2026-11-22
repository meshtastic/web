import { type NavPath, navPaths } from "@core/navigation/navItems.ts";

/**
 * Two-key "go to" shortcuts: press G, then a letter, within a second.
 * Pure state machine; the shell feeds it key events.
 */

export const CHORD_TIMEOUT_MS = 1000;

export const CHORD_LEADER = "g";

/** Second key → destination. */
export const goChords = {
  c: navPaths.messages,
  n: navPaths.nodes,
  m: navPaths.map,
  s: navPaths.settings,
} as const satisfies Record<string, NavPath>;

export type GoChordKey = keyof typeof goChords;

const isGoChordKey = (key: string): key is GoChordKey =>
  Object.hasOwn(goChords, key);

/** The display keys for a destination's chord, e.g. ["G", "M"]. */
export const chordKeysFor = (
  path: NavPath,
): readonly [string, string] | undefined => {
  const entry = Object.entries(goChords).find(([, target]) => target === path);
  return entry
    ? [CHORD_LEADER.toUpperCase(), entry[0].toUpperCase()]
    : undefined;
};

export interface ChordState {
  /** When the leader key was pressed, or null when idle. */
  readonly pendingSince: number | null;
}

export const idleChord: ChordState = { pendingSince: null };

export interface ChordKeyInput {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  /** The key went to a text field, select or contenteditable. */
  readonly editable: boolean;
  /** A dialog (or the command menu) is open; shortcuts stay off. */
  readonly blocked: boolean;
}

export interface ChordStep {
  readonly state: ChordState;
  /** Set when the chord completed. */
  readonly path?: NavPath;
}

export const nextChord = (
  state: ChordState,
  input: ChordKeyInput,
  now: number,
): ChordStep => {
  if (input.metaKey || input.ctrlKey || input.altKey) {
    return { state: idleChord };
  }
  if (input.editable || input.blocked) {
    return { state: idleChord };
  }
  const key = input.key.toLowerCase();
  const pending =
    state.pendingSince !== null && now - state.pendingSince <= CHORD_TIMEOUT_MS;
  if (pending && isGoChordKey(key)) {
    return { state: idleChord, path: goChords[key] };
  }
  if (key === CHORD_LEADER) {
    return { state: { pendingSince: now } };
  }
  return { state: idleChord };
};
