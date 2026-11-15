import { fromBinary } from "@bufbuild/protobuf";
import { Protobuf, type Types } from "@core/protobuf.ts";
import { signal } from "@preact/signals-core";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

export interface Channel {
  readonly index: number;
  readonly role: Protobuf.Channel.Channel_Role;
  readonly settings?: Protobuf.Channel.ChannelSettings;
}

/** A Mesh Beacon invitation heard from another node. */
export interface MeshBeaconOffer {
  readonly from: number;
  readonly rxTime: Date;
  readonly beacon: Protobuf.MeshBeacon.MeshBeacon;
}

export function channelFromProto(channel: Protobuf.Channel.Channel): Channel {
  return {
    index: channel.index,
    role: channel.role,
    settings: channel.settings,
  };
}

/** The device's channel table and the Mesh Beacon offers heard this session. */
export class ChannelsClient {
  private readonly channels = signal<ReadonlyMap<number, Channel>>(new Map());
  private readonly listStore = signal<ReadonlyArray<Channel>>([]);
  private readonly offers = signal<ReadonlyArray<MeshBeaconOffer>>([]);

  readonly list: ReadonlySignal<ReadonlyArray<Channel>>;
  /** Newest first, one per sender; our own and channel-less beacons are skipped. */
  readonly beaconOffers: ReadonlySignal<ReadonlyArray<MeshBeaconOffer>>;

  constructor(private readonly myNodeNum: () => number | undefined) {
    this.list = toReadonly(this.listStore);
    this.beaconOffers = toReadonly(this.offers);
  }

  applyChannel(channel: Protobuf.Channel.Channel): void {
    const next = new Map(this.channels.peek());
    next.set(channel.index, channelFromProto(channel));
    this.channels.value = next;
    this.listStore.value = [...next.values()].sort((a, b) => a.index - b.index);
  }

  applyChannels(encoded: ReadonlyArray<Uint8Array>): void {
    for (const bytes of encoded) {
      this.applyChannel(fromBinary(Protobuf.Channel.ChannelSchema, bytes));
    }
  }

  applyBeacon(
    packet: Types.PacketMetadata<Protobuf.MeshBeacon.MeshBeacon>,
  ): void {
    if (packet.from === this.myNodeNum() || !packet.data.offerChannel) return;
    const others = this.offers.peek().filter((o) => o.from !== packet.from);
    this.offers.value = [
      { from: packet.from, rxTime: packet.rxTime, beacon: packet.data },
      ...others,
    ];
  }

  dismissBeaconOffer(from: number): void {
    this.offers.value = this.offers.peek().filter((o) => o.from !== from);
  }

  get(index: number): Channel | undefined {
    return this.channels.peek().get(index);
  }
}
