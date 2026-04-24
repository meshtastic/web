import type * as Protobuf from "@meshtastic/protobufs";

export interface Channel {
  readonly index: number;
  readonly role: Protobuf.Channel.Channel_Role;
  readonly settings?: Protobuf.Channel.ChannelSettings;
}
