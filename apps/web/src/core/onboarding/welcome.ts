import type { Connection } from "@core/stores/deviceStore/types.ts";

/** What the app remembers about radios it reached before. */
export interface ConnectionHistory {
  readonly savedConnections: ReadonlyArray<Pick<Connection, "nodeNum">>;
  /**
   * Node numbers of the persisted devices. Older saved connections predate
   * `nodeNum`, but their device entries kept the radio's node number.
   */
  readonly deviceNodeNums: ReadonlyArray<number | undefined>;
}

/**
 * A radio was reached once a handshake reported its node number; failed
 * attempts and never-opened entries have none.
 */
export const hasEverConnected = (history: ConnectionHistory): boolean =>
  history.savedConnections.some((c) => c.nodeNum !== undefined) ||
  history.deviceNodeNums.some((num) => num !== undefined);

export interface WelcomeGate {
  /** The saved connections have loaded from storage. */
  readonly hydrated: boolean;
  /** The user finished or skipped the wizard in this browser. */
  readonly dismissed: boolean;
}

/**
 * Whether to send the user to the welcome wizard: only once the saved
 * connections have loaded (they start empty), never after the wizard was
 * finished or skipped, and only while no radio has ever connected.
 */
export function shouldShowWelcome(
  history: ConnectionHistory,
  gate: WelcomeGate,
): boolean {
  return gate.hydrated && !gate.dismissed && !hasEverConnected(history);
}

/** localStorage key for the finished-or-skipped flag. */
export const WELCOME_DISMISSED_KEY = "meshtastic.welcomeDismissed";

type FlagStorage = Pick<Storage, "getItem" | "setItem">;

const defaultStorage = (): FlagStorage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

/** Reads the dismissed flag; storage that throws counts as not dismissed. */
export function isWelcomeDismissed(
  storage: FlagStorage | undefined = defaultStorage(),
): boolean {
  try {
    return storage?.getItem(WELCOME_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remembers that the wizard was finished or skipped in this browser. */
export function markWelcomeDismissed(
  storage: FlagStorage | undefined = defaultStorage(),
): void {
  try {
    storage?.setItem(WELCOME_DISMISSED_KEY, "1");
  } catch {
    // Private windows can refuse storage; the wizard just shows again.
  }
}

/** Where the wizard lives; App renders it outside the shell. */
export const WELCOME_PATH = "/welcome";
