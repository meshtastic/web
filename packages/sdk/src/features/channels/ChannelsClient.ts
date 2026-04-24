import type * as Protobuf from "@meshtastic/protobufs";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import { clearChannel, getChannel, setChannel } from "./application/ChannelUseCases.ts";
import type { Channel } from "./domain/Channel.ts";
import { ChannelMapper } from "./infrastructure/ChannelMapper.ts";
import { ChannelsStore } from "./state/channelsStore.ts";

export class ChannelsClient {
  private readonly client: MeshClient;
  private readonly store: ChannelsStore;
  public readonly list: ReadonlySignal<ReadonlyArray<Channel>>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = new ChannelsStore();
    this.list = this.store.read;

    client.events.onChannelPacket.subscribe((ch) => {
      this.store.set(ch.index, ChannelMapper.fromProto(ch));
    });
  }

  public get(index: number): Channel | undefined {
    return this.store.get(index);
  }

  public set(channel: Protobuf.Channel.Channel): Promise<ResultType<number, Error>> {
    return setChannel(this.client, channel);
  }

  public requestChannel(index: number): Promise<ResultType<number, Error>> {
    return getChannel(this.client, index);
  }

  public clear(index: number): Promise<ResultType<number, Error>> {
    return clearChannel(this.client, index);
  }
}
