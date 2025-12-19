import type { NewMessage } from "@data/schema";
import type { ConversationType } from "@data/types";
import type { Types } from "@meshtastic/core";

class PacketToMessageDTO {
  channelId: Types.ChannelNumber;
  toNode: number;
  fromNode: number;
  date: Date;
  messageId: number;
  state: "waiting" | "sending" | "sent" | "ack" | "failed";
  message: string;
  type: ConversationType;
  hops: number;
  rxRssi: number;
  rxSnr: number;
  viaMqtt: boolean;

  constructor(data: Types.PacketMetadata<string>, nodeNum: number) {
    this.channelId = data.channel;
    this.toNode = data.to;
    this.fromNode = data.from;
    this.messageId = data.id;
    this.state = data.from !== nodeNum ? "ack" : "waiting";
    this.message = data.data;
    this.type = data.type === "direct" ? "direct" : "channel";

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
    this.date = new Date(dateTimestamp);
    this.hops = data.hops;
    this.rxRssi = data.rxRssi;
    this.rxSnr = data.rxSnr;
    this.viaMqtt = data.viaMqtt;
  }

  toNewMessage(deviceId: number): NewMessage {
    return {
      deviceId,
      channelId: this.channelId,
      toNode: this.toNode,
      fromNode: this.fromNode,
      date: this.date,
      messageId: this.messageId,
      state: this.state,
      message: this.message,
      type: this.type,
      hops: this.hops,
      rxRssi: this.rxRssi,
      rxSnr: this.rxSnr,
      viaMqtt: this.viaMqtt,
    };
  }
}

export default PacketToMessageDTO;
