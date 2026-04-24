import type { PacketMetadata } from "../../../core/types.ts";
import type { Message } from "../domain/Message.ts";
import { MessageState } from "../domain/MessageState.ts";

export const MessageMapper = {
  fromPacket(packet: PacketMetadata<string>, state: MessageState = MessageState.Ack): Message {
    return {
      id: packet.id,
      from: packet.from,
      to: packet.to,
      channel: packet.channel,
      rxTime: packet.rxTime,
      type: packet.type,
      text: packet.data,
      state,
    };
  },
};
