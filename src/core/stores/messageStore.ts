import { Protobuf, Types } from "@meshtastic/js";

export interface MessageWithState extends Types.PacketMetadata<string> {
  state: MessageState;
}

export type MessageState = "ack" | "waiting" | Protobuf.Mesh.Routing_Error;

export default class MessageStore {
  constructor(deviceNumber: number, channelNumber: number) {
    this.deviceNumber = deviceNumber;
    this.channelNumber = channelNumber;
    this.messageIdsKey = `device/${this.deviceNumber}/group/${this.channelNumber}/message_ids`;
    this.cursor = 0;
    this.loaded = false;
    this.messageIds = [];
    this.messages = [];

    this.loadMessageIds();
    this.loadMessages();
  }

  messageKey(messageId: number): string  {
    return `device/${this.deviceNumber}/message/${messageId}`;
  }

  addMessage(message: MessageWithState): void {
    this.setMessage(message);

    this.messageIds.unshift(message.id);
    localStorage.setItem(this.messageIdsKey, JSON.stringify(this.messageIds));

    this.messages.push(message);
  }

  getMessage(messageId: number): MessageWithState {
    const messageKey = this.messageKey(messageId);
    const messageJSON = localStorage.getItem(messageKey);

    if (messageJSON === null) {
      return null;
    }

    const message = JSON.parse(messageJSON);

    message.rxTime = new Date(message.rxTime);

    return message;
  }

  setMessage(message: MessageWithState): void {
    const messageKey = this.messageKey(message.id);

    localStorage.setItem(messageKey, JSON.stringify(message));
  }

  setMessageState(messageId: number, state: MessageState): void {
    const message = this.getMessage(messageId);

    message.state = state;

    this.setMessage(message);

    this.messages.forEach((m, i) => {
      if (m.id === messageId) {
        this.messages[i] = message
        return;
      }
    });
  }

  deleteMessage(messageId: number): void {
    const messageKey = this.messageKey(messageId);
    localStorage.removeItem(messageKey);
  }

  loadMessageIds(): void {
    const messageIdsJSON = localStorage.getItem(this.messageIdsKey);

    if (messageIdsJSON === null) {
      this.messageIds = [];
      localStorage.setItem(this.messageIdsKey, JSON.stringify(this.messageIds));
      return;
    }

    this.messageIds = JSON.parse(messageIdsJSON);
  }

  loadMessages(): void {
    if (this.loaded) return;

    let message;

    for (let i = this.cursor; i <= 50 + this.cursor; i++) {
      message = this.getMessage(this.messageIds[i]);

      if (message === null) {
        this.loaded = true;
        return;
      }

      this.cursor = i;
      this.messages.unshift(message);
    };
  }

  clear() {
    this.messageIds.forEach((messageId) => {
      this.deleteMessage(messageId);
    });

    localStorage.removeItem(this.messageIdsKey);

    this.messageIds = [];
    this.messages = [];
  }
}
