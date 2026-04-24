import type * as Protobuf from "@meshtastic/protobufs";
import type { Channel } from "../domain/Channel.ts";

export const ChannelMapper = {
  fromProto(ch: Protobuf.Channel.Channel): Channel {
    return { index: ch.index, role: ch.role, settings: ch.settings };
  },
};
