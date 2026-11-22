import { and, asc, eq } from "drizzle-orm";
import { Result } from "better-result";
import type { SqlocalDb } from "./db.ts";
import { filterOptOuts, filterSettings, filterWords } from "./schema.ts";
import { type ScopeOptions, type StorageScope, scopeOf } from "./scope.ts";
import { type ConversationKey, conversationKeyString } from "./types.ts";

/** One radio's message filter as stored. */
export interface StoredMessageFilter {
  readonly enabled: boolean;
  /** Entries in the order they were added. */
  readonly words: readonly string[];
  /** `conversationKeyString`s of conversations that opted out. */
  readonly optedOut: readonly string[];
}

export const EMPTY_STORED_FILTER: StoredMessageFilter = {
  enabled: false,
  words: [],
  optedOut: [],
};

/** A filter read or write that the database refused. */
export class MessageFilterStorageError extends Error {
  override readonly name = "MessageFilterStorageError";
}

export interface MessageFilterRepository {
  load(): Promise<Result<StoredMessageFilter, MessageFilterStorageError>>;
  setEnabled(
    enabled: boolean,
  ): Promise<Result<void, MessageFilterStorageError>>;
  /** Adds an entry; adding one already stored changes nothing. */
  addWord(pattern: string): Promise<Result<void, MessageFilterStorageError>>;
  removeWord(pattern: string): Promise<Result<void, MessageFilterStorageError>>;
  setOptedOut(
    key: ConversationKey,
    optedOut: boolean,
  ): Promise<Result<void, MessageFilterStorageError>>;
  setScope?(scope: number): void;
}

const storageError =
  (what: string) =>
  (cause: unknown): MessageFilterStorageError =>
    new MessageFilterStorageError(
      `${what}: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );

/**
 * The message filter's words, switch and per-conversation opt-outs, scoped
 * to one radio (`device_id`, see `StorageScope`).
 */
export class SqlocalMessageFilterRepository implements MessageFilterRepository {
  private readonly db: SqlocalDb;
  private readonly scope: StorageScope;
  private readonly now: () => number;

  constructor(
    db: SqlocalDb,
    options: ScopeOptions & { readonly now?: () => number },
  ) {
    this.db = db;
    this.scope = scopeOf(options);
    this.now = options.now ?? Date.now;
  }

  setScope(deviceId: number): void {
    this.scope.set(deviceId);
  }

  load(): Promise<Result<StoredMessageFilter, MessageFilterStorageError>> {
    return Result.tryPromise({
      try: () =>
        this.scope.run(async (deviceId) => {
          const [settings] = await this.db
            .select({ enabled: filterSettings.enabled })
            .from(filterSettings)
            .where(eq(filterSettings.deviceId, deviceId))
            .limit(1);
          const words = await this.db
            .select({ pattern: filterWords.pattern })
            .from(filterWords)
            .where(eq(filterWords.deviceId, deviceId))
            .orderBy(asc(filterWords.createdAt), asc(filterWords.pattern));
          const optOuts = await this.db
            .select({ key: filterOptOuts.conversationKey })
            .from(filterOptOuts)
            .where(eq(filterOptOuts.deviceId, deviceId));
          return {
            enabled: settings?.enabled ?? false,
            words: words.map((w) => w.pattern),
            optedOut: optOuts.map((o) => o.key),
          };
        }),
      catch: storageError("could not load the message filter"),
    });
  }

  setEnabled(
    enabled: boolean,
  ): Promise<Result<void, MessageFilterStorageError>> {
    return Result.tryPromise({
      try: () =>
        this.scope.run(async (deviceId) => {
          await this.db
            .insert(filterSettings)
            .values({ deviceId, enabled })
            .onConflictDoUpdate({
              target: filterSettings.deviceId,
              set: { enabled },
            });
        }),
      catch: storageError("could not save the message filter switch"),
    });
  }

  addWord(pattern: string): Promise<Result<void, MessageFilterStorageError>> {
    return Result.tryPromise({
      try: () =>
        this.scope.run(async (deviceId) => {
          await this.db
            .insert(filterWords)
            .values({ deviceId, pattern, createdAt: this.now() })
            .onConflictDoNothing();
        }),
      catch: storageError("could not add a filter word"),
    });
  }

  removeWord(
    pattern: string,
  ): Promise<Result<void, MessageFilterStorageError>> {
    return Result.tryPromise({
      try: () =>
        this.scope.run(async (deviceId) => {
          await this.db
            .delete(filterWords)
            .where(
              and(
                eq(filterWords.deviceId, deviceId),
                eq(filterWords.pattern, pattern),
              ),
            );
        }),
      catch: storageError("could not remove a filter word"),
    });
  }

  setOptedOut(
    key: ConversationKey,
    optedOut: boolean,
  ): Promise<Result<void, MessageFilterStorageError>> {
    const conversationKey = conversationKeyString(key);
    return Result.tryPromise({
      try: () =>
        this.scope.run(async (deviceId) => {
          if (optedOut) {
            await this.db
              .insert(filterOptOuts)
              .values({ deviceId, conversationKey })
              .onConflictDoNothing();
            return;
          }
          await this.db
            .delete(filterOptOuts)
            .where(
              and(
                eq(filterOptOuts.deviceId, deviceId),
                eq(filterOptOuts.conversationKey, conversationKey),
              ),
            );
        }),
      catch: storageError("could not save the conversation's filter setting"),
    });
  }
}
