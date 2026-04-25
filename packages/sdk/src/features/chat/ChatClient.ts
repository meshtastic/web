import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import { Constants } from "../../core/constants/index.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { ChannelNumber } from "../../core/types.ts";
import type { DraftRepository } from "./domain/DraftRepository.ts";
import type { Message } from "./domain/Message.ts";
import type {
  ConversationKey,
  MessageRepository,
  RetentionPolicy,
} from "./domain/MessageRepository.ts";
import { MessageState } from "./domain/MessageState.ts";
import { MessageMapper } from "./infrastructure/MessageMapper.ts";
import { InMemoryDraftRepository } from "./infrastructure/repositories/InMemoryDraftRepository.ts";
import { InMemoryMessageRepository } from "./infrastructure/repositories/InMemoryMessageRepository.ts";
import { type SendTextError, type SendTextInput, sendText } from "./application/SendTextUseCase.ts";
import { ChatStore } from "./state/chatStore.ts";
import { DraftStore } from "./state/draftStore.ts";

export interface ChatClientOptions {
  repository?: MessageRepository;
  draftRepository?: DraftRepository;
  retention?: RetentionPolicy;
  /** Messages to load into the store on first subscription of a conversation. */
  initialLoadLimit?: number;
}

/**
 * Drafts namespace: per-conversation working text. Lazy-hydrates from the
 * configured DraftRepository on first read; auto-clears on successful send.
 */
export interface ChatDrafts {
  get(key: ConversationKey): ReadonlySignal<string>;
  set(key: ConversationKey, text: string): void;
  clear(key: ConversationKey): void;
}

/**
 * Chat slice facade. Exposes message buckets keyed by channel or peer, drafts
 * keyed the same way, and the `send` command for outbound text. Optional
 * persistence via MessageRepository / DraftRepository.
 */
export class ChatClient {
  private readonly client: MeshClient;
  private readonly store: ChatStore;
  private readonly draftStore: DraftStore;
  private readonly repository: MessageRepository;
  private readonly draftRepository: DraftRepository;
  private readonly retention: RetentionPolicy | undefined;
  private readonly initialLoadLimit: number;
  private readonly hydrated = new Set<string>();
  private readonly draftsHydrated = new Set<string>();

  public readonly drafts: ChatDrafts;

  constructor(client: MeshClient, options: ChatClientOptions = {}) {
    this.client = client;
    this.store = new ChatStore();
    this.draftStore = new DraftStore();
    this.repository = options.repository ?? new InMemoryMessageRepository();
    this.draftRepository = options.draftRepository ?? new InMemoryDraftRepository();
    this.retention = options.retention;
    this.initialLoadLimit = options.initialLoadLimit ?? 50;

    this.drafts = {
      get: (key) => this.draftFor(key),
      set: (key, text) => this.setDraft(key, text),
      clear: (key) => this.setDraft(key, ""),
    };

    client.events.onMessagePacket.subscribe((packet) => {
      const message = MessageMapper.fromPacket(packet);
      const conv: ConversationKey =
        packet.type === "direct" && packet.to !== Constants.broadcastNum
          ? { kind: "direct", peer: packet.from === client.myNodeNum ? packet.to : packet.from }
          : { kind: "channel", channel: packet.channel };
      const key = this.keyFor(conv);
      this.store.append(key, message);
      void this.persistAppend(message);
    });

    client.events.onRoutingPacket.subscribe((packet) => {
      if (packet.data.variant.case === "errorReason") {
        const state = packet.data.variant.value === 0 ? MessageState.Ack : MessageState.Failed;
        this.store.updateState(packet.id, state);
        void this.repository.updateState(packet.id, state).catch(() => {});
      }
    });
  }

  public messages(channel: ChannelNumber): ReadonlySignal<Message[]> {
    this.ensureHydrated({ kind: "channel", channel });
    return this.store.messagesForChannel(channel);
  }

  public direct(peer: number): ReadonlySignal<Message[]> {
    this.ensureHydrated({ kind: "direct", peer });
    return this.store.messagesForDirect(peer);
  }

  public async loadOlder(conv: ConversationKey, before: Date, limit = 50): Promise<Message[]> {
    const older = await this.repository.loadBefore(conv, before, limit);
    const key = this.keyFor(conv);
    for (let i = older.length - 1; i >= 0; i--) this.store.prepend(key, older[i]!);
    return older;
  }

  /**
   * Empties a single conversation from memory + persistence. Draft for the
   * same conversation is untouched; callers invoke `drafts.clear(conv)` too
   * if they want the compose box wiped.
   */
  public async clearConversation(conv: ConversationKey): Promise<void> {
    const key = this.keyFor(conv);
    this.store.clearBucket(key);
    this.hydrated.delete(key);
    try {
      await this.repository.clearConversation(conv);
    } catch {
      // ok
    }
  }

  /**
   * Wipes every message across every conversation for this client.
   */
  public async clearAll(): Promise<void> {
    this.store.clearAll();
    this.hydrated.clear();
    try {
      await this.repository.clear();
    } catch {
      // ok
    }
  }

  public async send(input: SendTextInput): Promise<ResultType<number, SendTextError>> {
    const result = await sendText(this.client, input);
    if (result.status === "ok") {
      const conv: ConversationKey =
        typeof input.destination === "number"
          ? { kind: "direct", peer: input.destination }
          : { kind: "channel", channel: input.channel ?? 0 };
      this.draftStore.clear(conv);
      void this.draftRepository.clear(conv).catch(() => {});
    }
    return result;
  }

  private ensureHydrated(conv: ConversationKey): void {
    const key = this.keyFor(conv);
    if (this.hydrated.has(key)) return;
    this.hydrated.add(key);
    void (async () => {
      try {
        const recent = await this.repository.loadRecent(conv, this.initialLoadLimit);
        for (const m of recent) this.store.append(key, m);
      } catch {
        // adapter may not have history yet; safe to ignore
      }
    })();
  }

  private draftFor(conv: ConversationKey): ReadonlySignal<string> {
    const key = this.keyFor(conv);
    if (!this.draftsHydrated.has(key)) {
      this.draftsHydrated.add(key);
      void (async () => {
        try {
          const stored = await this.draftRepository.load(conv);
          if (stored) this.draftStore.set(conv, stored);
        } catch {
          // ok
        }
      })();
    }
    return this.draftStore.get(conv);
  }

  private setDraft(conv: ConversationKey, text: string): void {
    this.draftsHydrated.add(this.keyFor(conv));
    this.draftStore.set(conv, text);
    void this.draftRepository.save(conv, text).catch(() => {
      // persistence failure must not break reactive flow
    });
  }

  private async persistAppend(message: Message): Promise<void> {
    try {
      await this.repository.append(message);
      if (this.retention) await this.repository.prune(this.retention);
    } catch {
      // persistence failure must not break reactive flow
    }
  }

  private keyFor(conv: ConversationKey): string {
    return conv.kind === "channel"
      ? this.store.channelKey(conv.channel)
      : this.store.directKey(conv.peer);
  }
}
