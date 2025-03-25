import type { Types } from "@meshtastic/js";
import { Message, MessageType, MessageState } from "@core/stores/messageStore.ts";

class PacketToMessageDTO {
  channel: Types.ChannelNumber;
  to: number;
  from: number;
  date: string;
  messageId: number;
  state: MessageState;
  message: string;
  type: MessageType;

  constructor(data: Types.PacketMetadata<string>, nodeNum: number) {
    const payload = data

    this.channel = payload.channel
    this.to = payload.to;
    this.from = payload.from;
    this.date = new Date(payload.rxTime).toISOString();
    this.messageId = payload.id;
    this.state = payload.from !== nodeNum ? "ack" : "waiting";
    this.message = payload.data;
    this.type = payload.type;
  }

  toMessage(): Message {
    return {
      channel: this.channel,
      to: this.to,
      from: this.from,
      date: this.date,
      messageId: this.messageId,
      state: this.state,
      message: this.message,
      type: this.type,
    } as Message;
  }
}

export default PacketToMessageDTO;