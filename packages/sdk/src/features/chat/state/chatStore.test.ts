import { describe, expect, it } from "vitest";
import { ChannelNumber } from "../../../core/types.ts";
import type { Message } from "../domain/Message.ts";
import { MessageState } from "../domain/MessageState.ts";
import { ChatStore } from "./chatStore.ts";

function message(id: number, type: Message["type"]): Message {
  return {
    id,
    from: 1,
    to: type === "direct" ? 2 : 0xffffffff,
    channel: ChannelNumber.Primary,
    rxTime: new Date(0),
    type,
    text: "retry me",
    state: MessageState.Failed,
  };
}

describe("ChatStore", () => {
  it("deletes a message id from every conversation bucket", () => {
    const store = new ChatStore();
    const channel = store.messagesForChannel(ChannelNumber.Primary);
    const direct = store.messagesForDirect(2);
    store.append(
      store.channelKey(ChannelNumber.Primary),
      message(42, "broadcast"),
    );
    store.append(store.directKey(2), message(42, "direct"));

    expect(store.deleteMessage(42)).toBe(true);

    expect(channel.value).toEqual([]);
    expect(direct.value).toEqual([]);
    expect(store.deleteMessage(42)).toBe(false);
  });
});
