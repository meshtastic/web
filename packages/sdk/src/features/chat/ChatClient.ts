import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import { Constants } from "../../core/constants/index.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { ChannelNumber } from "../../core/types.ts";
import type { Message } from "./domain/Message.ts";
import { MessageState } from "./domain/MessageState.ts";
import { MessageMapper } from "./infrastructure/MessageMapper.ts";
import { type SendTextError, type SendTextInput, sendText } from "./application/SendTextUseCase.ts";
import { ChatStore } from "./state/chatStore.ts";

/**
 * Chat slice facade. Exposes message buckets keyed by channel or peer, and the
 * `send` command for outbound text.
 */
export class ChatClient {
  private readonly client: MeshClient;
  private readonly store: ChatStore;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = new ChatStore();

    client.events.onMessagePacket.subscribe((packet) => {
      const message = MessageMapper.fromPacket(packet);
      const key =
        packet.type === "direct" && packet.to !== Constants.broadcastNum
          ? this.store.directKey(packet.from === client.myNodeNum ? packet.to : packet.from)
          : this.store.channelKey(packet.channel);
      this.store.append(key, message);
    });

    client.events.onRoutingPacket.subscribe((packet) => {
      if (packet.data.variant.case === "errorReason") {
        const state = packet.data.variant.value === 0 ? MessageState.Ack : MessageState.Failed;
        this.store.updateState(packet.id, state);
      }
    });
  }

  public messages(channel: ChannelNumber): ReadonlySignal<Message[]> {
    return this.store.messagesForChannel(channel);
  }

  public direct(peer: number): ReadonlySignal<Message[]> {
    return this.store.messagesForDirect(peer);
  }

  public send(input: SendTextInput): Promise<ResultType<number, SendTextError>> {
    return sendText(this.client, input);
  }
}
