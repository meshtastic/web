import {
  compileFilter,
  type FilterEntryError,
  type FilterState,
  validateFilterEntry,
} from "@core/messaging/messageFilter.ts";
import {
  EMPTY_STORED_FILTER,
  type MessageFilterRepository,
  MessageFilterStorageError,
  type StoredMessageFilter,
} from "@core/storage/messageFilter.ts";
import {
  type ConversationKey,
  conversationKeyString,
} from "@core/storage/types.ts";
import { computed, signal } from "@preact/signals-core";
import { Result } from "better-result";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

/** Why a word was not added: the entry itself, or storage refusing it. */
export type AddFilterWordError =
  | FilterEntryError
  | { readonly kind: "storage"; readonly error: MessageFilterStorageError };

/** What the chat client reads to hide filtered messages. */
export interface ChatFilter {
  readonly state: ReadonlySignal<FilterState>;
  /** "Show filtered" for one conversation (`conversationKeyString`). */
  revealed(key: string): ReadonlySignal<boolean>;
}

/**
 * One radio's message filter: the switch, the words and the conversations
 * that opted out, loaded from and saved to storage under the session's
 * scope, plus which conversations show their filtered messages (for this
 * session only, as on Android). Every view reads the same signals, so a
 * change applies everywhere at once. Without a repository it works in
 * memory.
 */
export class MessageFilterClient implements ChatFilter {
  private readonly store = signal<StoredMessageFilter>(EMPTY_STORED_FILTER);
  private readonly revealedKeys = signal<ReadonlySet<string>>(new Set());
  private epoch = 0;
  /** Writes made while a load was in flight; the load is then redone. */
  private writesDuringLoad = 0;
  private loading = false;

  readonly enabled: ReadonlySignal<boolean>;
  /** Entries in the order they were added. */
  readonly words: ReadonlySignal<readonly string[]>;
  readonly state: ReadonlySignal<FilterState>;

  constructor(
    private readonly repository: MessageFilterRepository | undefined,
    private readonly warn: (
      message: string,
      ...args: unknown[]
    ) => void = () => {},
  ) {
    // Plain computeds: `deriveSignal` over a `toReadonly` source drops its
    // first change, as both skip the initial subscribe call.
    this.enabled = toReadonly(computed(() => this.store.value.enabled));
    this.words = toReadonly(computed(() => this.store.value.words));
    const matcher = computed(() => compileFilter(this.store.value.words));
    const optedOut = computed(() => new Set(this.store.value.optedOut));
    this.state = toReadonly(
      computed((): FilterState => ({
        enabled: this.store.value.enabled,
        matcher: matcher.value,
        optedOut: optedOut.value,
      })),
    );
    void this.load();
  }

  optedOut(key: ConversationKey): ReadonlySignal<boolean> {
    const k = conversationKeyString(key);
    return toReadonly(computed(() => this.state.value.optedOut.has(k)));
  }

  revealed(key: string): ReadonlySignal<boolean> {
    return toReadonly(computed(() => this.revealedKeys.value.has(key)));
  }

  setRevealed(key: ConversationKey, revealed: boolean): void {
    const k = conversationKeyString(key);
    const current = this.revealedKeys.peek();
    if (current.has(k) === revealed) return;
    const next = new Set(current);
    if (revealed) next.add(k);
    else next.delete(k);
    this.revealedKeys.value = next;
  }

  setEnabled(
    enabled: boolean,
  ): Promise<Result<void, MessageFilterStorageError>> {
    return this.write(
      (s) => ({ ...s, enabled }),
      (repo) => repo.setEnabled(enabled),
    );
  }

  /** Validates and adds an entry. Ok holds the entry as stored (trimmed). */
  async addWord(input: string): Promise<Result<string, AddFilterWordError>> {
    const valid = validateFilterEntry(input, this.store.peek().words);
    if (Result.isError(valid)) return Result.err(valid.error);
    const word = valid.value;
    const saved = await this.write(
      (s) => ({ ...s, words: [...s.words, word] }),
      (repo) => repo.addWord(word),
    );
    return Result.isError(saved)
      ? Result.err({ kind: "storage", error: saved.error })
      : Result.ok(word);
  }

  removeWord(word: string): Promise<Result<void, MessageFilterStorageError>> {
    return this.write(
      (s) => ({ ...s, words: s.words.filter((w) => w !== word) }),
      (repo) => repo.removeWord(word),
    );
  }

  setOptedOut(
    key: ConversationKey,
    optedOut: boolean,
  ): Promise<Result<void, MessageFilterStorageError>> {
    const k = conversationKeyString(key);
    return this.write(
      (s) => ({
        ...s,
        optedOut: optedOut
          ? s.optedOut.includes(k)
            ? s.optedOut
            : [...s.optedOut, k]
          : s.optedOut.filter((o) => o !== k),
      }),
      (repo) => repo.setOptedOut(key, optedOut),
    );
  }

  /** Points at another radio's filter and loads it. */
  rescope(scope: number): void {
    this.repository?.setScope?.(scope);
    this.epoch++;
    this.store.value = EMPTY_STORED_FILTER;
    this.revealedKeys.value = new Set();
    void this.load();
  }

  /**
   * Applies `change` straight away and saves it; if saving fails the
   * change is undone (unless something else changed the filter since).
   */
  private async write(
    change: (s: StoredMessageFilter) => StoredMessageFilter,
    save: (
      repo: MessageFilterRepository,
    ) => Promise<Result<void, MessageFilterStorageError>>,
  ): Promise<Result<void, MessageFilterStorageError>> {
    const before = this.store.peek();
    const after = change(before);
    this.store.value = after;
    if (!this.repository) return Result.ok(undefined);
    if (this.loading) this.writesDuringLoad++;
    const saved = await save(this.repository).catch((cause: unknown) =>
      Result.err(
        new MessageFilterStorageError(
          cause instanceof Error ? cause.message : String(cause),
          { cause },
        ),
      ),
    );
    if (Result.isError(saved)) {
      this.warn("message filter: could not save", saved.error.message);
      if (this.store.peek() === after) this.store.value = before;
    }
    return saved;
  }

  private async load(): Promise<void> {
    const repo = this.repository;
    if (!repo) return;
    const epoch = this.epoch;
    this.loading = true;
    this.writesDuringLoad = 0;
    const loaded = await repo.load();
    if (epoch !== this.epoch) return;
    this.loading = false;
    if (Result.isError(loaded)) {
      this.warn("message filter: could not load", loaded.error.message);
      return;
    }
    // A write landed while loading: storage has it now, so read again.
    if (this.writesDuringLoad > 0) {
      void this.load();
      return;
    }
    this.store.value = loaded.value;
  }
}
