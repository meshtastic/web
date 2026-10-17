import type * as Protobuf from "@meshtastic/protobufs";
import type { Result } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import {
  createStore,
  type ReadonlySignal,
} from "../../core/signals/createStore.ts";
import {
  clearChannel,
  getChannel,
  setChannel,
} from "./application/ChannelUseCases.ts";
import type { Channel } from "./domain/Channel.ts";
import type { MeshBeaconOffer } from "./domain/MeshBeaconOffer.ts";
import { ChannelMapper } from "./infrastructure/ChannelMapper.ts";
import { ChannelsStore } from "./state/channelsStore.ts";

export class ChannelsClient {
  private readonly client: MeshClient;
  private readonly store: ChannelsStore;
  public readonly list: ReadonlySignal<ReadonlyArray<Channel>>;
  private readonly offersStore = createStore<ReadonlyArray<MeshBeaconOffer>>(
    [],
  );
  /**
   * Mesh Beacon invitations heard this session, newest first, one per
   * sender. Our own beacons and beacons without a channel are skipped.
   */
  public readonly beaconOffers: ReadonlySignal<ReadonlyArray<MeshBeaconOffer>>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = new ChannelsStore();
    this.list = this.store.read;
    this.beaconOffers = this.offersStore.read;

    client.events.onChannelPacket.subscribe((ch) => {
      this.store.set(ch.index, ChannelMapper.fromProto(ch));
    });

    client.events.onMeshBeaconPacket.subscribe((packet) => {
      if (packet.from === client.myNodeNum) return;
      if (!packet.data.offerChannel) return;
      const others = this.offersStore.write
        .peek()
        .filter((o) => o.from !== packet.from);
      this.offersStore.write.value = [
        { from: packet.from, rxTime: packet.rxTime, beacon: packet.data },
        ...others,
      ];
    });
  }

  /** Forget an offer, e.g. once the user joined or dismissed it. */
  public dismissBeaconOffer(from: number): void {
    this.offersStore.write.value = this.offersStore.write
      .peek()
      .filter((o) => o.from !== from);
  }

  public get(index: number): Channel | undefined {
    return this.store.get(index);
  }

  public set(
    channel: Protobuf.Channel.Channel,
  ): Promise<Result<number, Error>> {
    return setChannel(this.client, channel);
  }

  public requestChannel(index: number): Promise<Result<number, Error>> {
    return getChannel(this.client, index);
  }

  public clear(index: number): Promise<Result<number, Error>> {
    return clearChannel(this.client, index);
  }
}
