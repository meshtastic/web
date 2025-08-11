import { MessageState, MessageType } from "@core/stores";
import type { Message } from "@core/stores/messageStore/types.ts";
import type { Types } from "@meshtastic/core";

class PacketToMessageDTO {
  channel: Types.ChannelNumber;
  to: number;
  from: number;
  date: number; // (timestamp ms)
  messageId: number;
  state: MessageState;
  message: string;
  type: MessageType;

  constructor(data: Types.PacketMetadata<string>, nodeNum: number) {
    this.channel = data.channel;
    this.to = data.to;
    this.from = data.from;
    this.messageId = data.id;
    this.state =
      data.from !== nodeNum ? MessageState.Ack : MessageState.Waiting;
    this.message = data.data;
    this.type =
      data.type === "direct" ? MessageType.Direct : MessageType.Broadcast;

    let dateTimestamp = Date.now();
    if (data.rxTime instanceof Date) {
      const timeValue = data.rxTime.getTime();

      if (!Number.isNaN(timeValue)) {
        dateTimestamp = timeValue;
      }
    } else if (data.rxTime != null) {
      console.warn(
        `Received rxTime in PacketToMessageDTO was not a Date object as expected (type: ${typeof data.rxTime}, value: ${data.rxTime}). Using current time as fallback.`,
      );
    }
    this.date = dateTimestamp;
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
    };
  }
}

export default PacketToMessageDTO;
