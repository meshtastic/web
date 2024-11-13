import { Protobuf, Types } from "@meshtastic/js";

export interface MessageWithState extends Types.PacketMetadata<string> {
  state: MessageState;
}

export type MessageState = "ack" | "waiting" | Protobuf.Mesh.Routing_Error;

export default class MessageStore {
  constructor(deviceNumber: number, channelNumber: number) {
    this.deviceNumber = deviceNumber;
    this.channelNumber = channelNumber;
    this.indexKey = `device/${this.deviceNumber}/group/${this.channelNumber}/index`;
    this.messages = [];

    this.loadMessages();
  }

  get currentIndex(): number {
    return parseInt(localStorage.getItem(this.indexKey)) || 0;
  }

  messageKey(messageIndex: number): string  {
    return `device/${this.deviceNumber}/group/${this.channelNumber}/message/${messageIndex}`;
  }

  nextIndex(): number {
    const nextIndex = this.currentIndex + 1;

    localStorage.setItem(this.indexKey, nextIndex);

    return nextIndex;
  }

  addMessage(message: MessageWithState): void {
    const messageIndex = this.nextIndex();
    const messageKey = this.messageKey(messageIndex);

    localStorage.setItem(messageKey, JSON.stringify(message));

    this.messages.push(message);
  }

  getMessage(messageIndex: number): MessageWithState {
    const messageKey = this.messageKey(messageIndex);

    const messageJSON = localStorage.getItem(messageKey);

    if (messageJSON === null) {
      return;
    }

    const message = JSON.parse(messageJSON);

    message.rxTime = new Date(message.rxTime);

    return message;
  }

  setMessageState(messageId: number, state: MessageState): void {
    this.messages.forEach((message, i) => {
      if (message.id === messageId) {
        const messageKey = this.messageKey(i + 1);

        message.state = state;
        localStorage.setItem(messageKey, JSON.stringify(message));

        return;
      }
    });
  }

  deleteMessage(messageIndex: number): void {
    const messageKey = this.messageKey(messageIndex);
    localStorage.removeItem(messageKey);
  }

  loadMessages(): MessageWithState[] {
    if (this.currentIndex === 0) {
      return;
    }

    for (let i = 1; i <= this.currentIndex; i++) {
      this.messages.push(this.getMessage(i));
    }
  }

  clear() {
    if (this.currentIndex === 0) {
      return;
    }

    for (let i = 1; i <= this.currentIndex; i++) {
      this.deleteMessage(i);
    }

    localStorage.removeItem(this.indexKey);

    this.messages = [];
  }
}
