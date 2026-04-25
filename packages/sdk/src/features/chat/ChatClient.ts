import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import { Constants } from "../../core/constants/index.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { ChannelNumber } from "../../core/types.ts";
import type { Message } from "./domain/Message.ts";
import type {
  ConversationKey,
  MessageRepository,
  RetentionPolicy,
} from "./domain/MessageRepository.ts";
import { MessageState } from "./domain/MessageState.ts";
import { MessageMapper } from "./infrastructure/MessageMapper.ts";
import { InMemoryMessageRepository } from "./infrastructure/repositories/InMemoryMessageRepository.ts";
import { type SendTextError, type SendTextInput, sendText } from "./application/SendTextUseCase.ts";
import { ChatStore } from "./state/chatStore.ts";

export interface ChatClientOptions {
  repository?: MessageRepository;
  retention?: RetentionPolicy;
  /** Messages to load into the store on first subscription of a conversation. */
  initialLoadLimit?: number;
}

/**
 * Chat slice facade. Exposes message buckets keyed by channel or peer, and the
 * `send` command for outbound text. Optional persistence via MessageRepository.
 */
export class ChatClient {
  private readonly client: MeshClient;
  private readonly store: ChatStore;
  private readonly repository: MessageRepository;
  private readonly retention: RetentionPolicy | undefined;
  private readonly initialLoadLimit: number;
  private readonly hydrated = new Set<string>();

  constructor(client: MeshClient, options: ChatClientOptions = {}) {
    this.client = client;
    this.store = new ChatStore();
    this.repository = options.repository ?? new InMemoryMessageRepository();
    this.retention = options.retention;
    this.initialLoadLimit = options.initialLoadLimit ?? 50;

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
    // older is sorted oldest → newest. Iterate in reverse so each prepend
    // lands ahead of the previous, preserving chronological order.
    for (let i = older.length - 1; i >= 0; i--) this.store.prepend(key, older[i]!);
    return older;
  }

  public send(input: SendTextInput): Promise<ResultType<number, SendTextError>> {
    return sendText(this.client, input);
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
