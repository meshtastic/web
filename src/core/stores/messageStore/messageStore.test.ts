import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConversationId,
  MessageState,
  MessageType,
  useMessageStore,
} from "./index.ts";
import type {
  ChannelId,
  ConversationId,
  Message,
  MessageLogMap,
} from "./types.ts";
import { Types } from "@meshtastic/core";

vi.mock("../storage/indexDB.ts", () => {
  const memoryStorage: Record<string, string> = {};
  return {
    storageWithMapSupport: {
      getItem: vi.fn(async (name: string): Promise<string | null> => {
        return await memoryStorage[name] ?? null;
      }),
      setItem: vi.fn(async (name: string, value: string): Promise<void> => {
        memoryStorage[name] = await value;
      }),
      removeItem: vi.fn(async (name: string): Promise<void> => {
        await delete memoryStorage[name];
      }),
    },
  };
});

const myNodeNum = 111;
const otherNodeNum1 = 222;
const otherNodeNum2 = 333;
const broadcastChannel: ChannelId = 0;

const directMessageToOther1: Message = {
  type: MessageType.Direct,
  from: myNodeNum,
  to: otherNodeNum1,
  channel: 0,
  date: Date.now(),
  messageId: 101,
  state: MessageState.Waiting,
  message: "Hello other 1 from me",
};

const directMessageFromOther1: Message = {
  type: MessageType.Direct,
  from: otherNodeNum1,
  to: myNodeNum,
  channel: 0,
  date: Date.now() + 1000,
  messageId: 102,
  state: MessageState.Waiting,
  message: "Hello me from other 1",
};

const directMessageToOther2: Message = {
  type: MessageType.Direct,
  from: myNodeNum,
  to: otherNodeNum2,
  channel: 0,
  date: Date.now() + 2000,
  messageId: 103,
  state: MessageState.Waiting,
  message: "Hello other 2 from me",
};

const broadcastMessage1: Message = {
  type: MessageType.Broadcast,
  from: otherNodeNum1,
  to: 0xffffffff,
  channel: broadcastChannel,
  date: Date.now() + 3000,
  messageId: 201,
  state: MessageState.Waiting,
  message: "Broadcast message 1",
};

const broadcastMessage2: Message = {
  type: MessageType.Broadcast,
  from: myNodeNum,
  to: 0xffffffff,
  channel: broadcastChannel,
  date: Date.now() + 4000,
  messageId: 202,
  state: MessageState.Waiting,
  message: "Broadcast message 2",
};

describe("useMessageStore", () => {
  const initialState = useMessageStore.getState();

  beforeEach(() => {
    useMessageStore.setState({
      ...initialState,
      messages: {
        direct: new Map<ConversationId, MessageLogMap>(),
        broadcast: new Map<ChannelId, MessageLogMap>(),
      },
      draft: new Map<Types.Destination, string>(),
    }, true);
  });

  it("should have correct initial state", () => {
    const state = useMessageStore.getState();
    expect(state.messages.direct).toBeInstanceOf(Map);
    expect(state.messages.direct.size).toBe(0);
    expect(state.messages.broadcast).toBeInstanceOf(Map);
    expect(state.messages.broadcast.size).toBe(0);
    expect(state.draft).toBeInstanceOf(Map);
    expect(state.draft.size).toBe(0);
    expect(state.nodeNum).toBe(0);
    expect(state.activeChat).toBe(0);
    expect(state.chatType).toBe(MessageType.Broadcast);
  });

  it("should set nodeNum", () => {
    useMessageStore.getState().setNodeNum(myNodeNum);
    expect(useMessageStore.getState().nodeNum).toBe(myNodeNum);
  });

  it("should set activeChat and chatType", () => {
    useMessageStore.getState().setActiveChat(otherNodeNum1);
    useMessageStore.getState().setChatType(MessageType.Direct);
    expect(useMessageStore.getState().activeChat).toBe(otherNodeNum1);
    expect(useMessageStore.getState().chatType).toBe(MessageType.Direct);
  });

  describe("saveMessage", () => {
    it("should save a direct message with correct Map structure", () => {
      useMessageStore.getState().saveMessage(directMessageToOther1);
      const state = useMessageStore.getState();
      const conversationId = getConversationId(
        directMessageToOther1.from,
        directMessageToOther1.to,
      );

      // Check if the conversation Map exists
      expect(state.messages.direct.has(conversationId)).toBe(true);
      const conversationLog = state.messages.direct.get(conversationId);
      // Check if the inner Map (MessageLogMap) exists and is a Map
      expect(conversationLog).toBeInstanceOf(Map);
      // Check if the message exists within the inner Map
      expect(conversationLog?.has(directMessageToOther1.messageId)).toBe(true);
      // Check the message content
      expect(conversationLog?.get(directMessageToOther1.messageId)).toEqual(
        directMessageToOther1,
      );
    });

    it("should save a broadcast message with correct Map structure", () => {
      useMessageStore.getState().saveMessage(broadcastMessage1);
      const state = useMessageStore.getState();
      const channelId = broadcastMessage1.channel;

      expect(state.messages.broadcast.has(channelId)).toBe(true);
      const channelLog = state.messages.broadcast.get(channelId);
      expect(channelLog).toBeInstanceOf(Map);
      expect(channelLog?.has(broadcastMessage1.messageId)).toBe(true);
      expect(channelLog?.get(broadcastMessage1.messageId)).toEqual(
        broadcastMessage1,
      );
    });

    it("should save multiple messages correctly", () => {
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(directMessageFromOther1);
      useMessageStore.getState().saveMessage(broadcastMessage1);

      const state = useMessageStore.getState();

      const convId1 = getConversationId(myNodeNum, otherNodeNum1);
      expect(
        state.messages.direct.get(convId1)?.get(
          directMessageToOther1.messageId,
        ),
      ).toEqual(directMessageToOther1);

      expect(
        state.messages.direct.get(convId1)?.get(
          directMessageFromOther1.messageId,
        ),
      ).toEqual(directMessageFromOther1);

      const channelId = broadcastMessage1.channel;
      expect(
        state.messages.broadcast.get(channelId)?.get(
          broadcastMessage1.messageId,
        ),
      ).toEqual(broadcastMessage1);
    });
  });

  describe("getMessages", () => {
    beforeEach(() => {
      useMessageStore.getState().setNodeNum(myNodeNum);
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(directMessageFromOther1);
      useMessageStore.getState().saveMessage(directMessageToOther2);
      useMessageStore.getState().saveMessage(broadcastMessage1);
      useMessageStore.getState().saveMessage(broadcastMessage2);
    });

    it("should return broadcast messages for a channel, sorted by date", () => {
      const messages = useMessageStore.getState().getMessages({
        type: MessageType.Broadcast,
        channelId: broadcastChannel,
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(broadcastMessage1);
      expect(messages[1]).toEqual(broadcastMessage2);
    });

    it("should return empty array for broadcast if channel has no messages", () => {
      const messages = useMessageStore.getState().getMessages({
        type: MessageType.Broadcast,
        channelId: Types.ChannelNumber.Channel1,
      });
      expect(messages).toEqual([]);
    });

    it("should return combined direct messages for a specific chat pair, sorted by date", () => {
      const messages = useMessageStore.getState().getMessages({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: otherNodeNum1,
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(directMessageToOther1);
      expect(messages[1]).toEqual(directMessageFromOther1);
    });

    it("should return only relevant direct messages for a different chat pair", () => {
      const messages = useMessageStore.getState().getMessages({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: otherNodeNum2,
      });
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(directMessageToOther2);
    });

    it("should return empty array for direct chat if no messages exist", () => {
      const messages = useMessageStore.getState().getMessages({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: 999,
      });
      expect(messages).toEqual([]);
    });
  });

  describe("setMessageState", () => {
    beforeEach(() => {
      useMessageStore.getState().setNodeNum(myNodeNum);
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(directMessageFromOther1);
      useMessageStore.getState().saveMessage(broadcastMessage1);
    });

    it("should update state for a direct message", () => {
      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        nodeA: directMessageToOther1.from,
        nodeB: directMessageToOther1.to,
        messageId: directMessageToOther1.messageId,
        newState: MessageState.Ack,
      });
      const conversationId = getConversationId(
        directMessageToOther1.from,
        directMessageToOther1.to,
      );
      const message = useMessageStore.getState().messages.direct.get(
        conversationId,
      )?.get(directMessageToOther1.messageId);
      expect(message?.state).toBe(MessageState.Ack);
    });

    it("should update state for another direct message in the same conversation", () => {
      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        nodeA: directMessageFromOther1.from,
        nodeB: directMessageFromOther1.to,
        messageId: directMessageFromOther1.messageId,
        newState: MessageState.Failed,
      });
      const conversationId = getConversationId(
        directMessageFromOther1.from,
        directMessageFromOther1.to,
      );
      const message = useMessageStore.getState().messages.direct.get(
        conversationId,
      )?.get(directMessageFromOther1.messageId);
      expect(message?.state).toBe(MessageState.Failed);
    });

    it("should update state for a broadcast message", () => {
      useMessageStore.getState().setMessageState({
        type: MessageType.Broadcast,
        channelId: broadcastChannel,
        messageId: broadcastMessage1.messageId,
        newState: MessageState.Ack,
      });
      const message = useMessageStore.getState().messages.broadcast.get(
        broadcastChannel,
      )?.get(broadcastMessage1.messageId);
      expect(message?.state).toBe(MessageState.Ack);
    });

    it("should warn if message is not found (direct)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: otherNodeNum1,
        messageId: 999,
        newState: MessageState.Ack,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Message or conversation/channel not found for state update",
        ),
      );
      warnSpy.mockRestore();
    });

    it("should warn if message is not found (broadcast)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      useMessageStore.getState().setMessageState({
        type: MessageType.Broadcast,
        channelId: broadcastChannel,
        messageId: 999,
        newState: MessageState.Ack,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Message or conversation/channel not found for state update",
        ),
      );
      warnSpy.mockRestore();
    });

    it("should warn if conversation/channel is not found", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: 998,
        messageId: 101,
        newState: MessageState.Ack,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Message or conversation/channel not found for state update",
        ),
      );
      warnSpy.mockRestore();
    });
  });

  describe("clearMessageByMessageId", () => {
    const extraDirectMessageId = 1011;
    beforeEach(() => {
      useMessageStore.getState().setNodeNum(myNodeNum);
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(directMessageFromOther1);
      useMessageStore.getState().saveMessage(broadcastMessage1);
      useMessageStore.getState().saveMessage({
        ...directMessageToOther1,
        messageId: extraDirectMessageId,
        date: Date.now() + 50,
      });
    });

    it("should delete a specific direct message", () => {
      const messageIdToDelete = directMessageToOther1.messageId;
      const nodeA = directMessageToOther1.from;
      const nodeB = directMessageToOther1.to;
      const conversationId = getConversationId(nodeA, nodeB);

      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: nodeA,
        nodeB: nodeB,
        messageId: messageIdToDelete,
      });

      const state = useMessageStore.getState();
      const conversationLog = state.messages.direct.get(conversationId);
      expect(conversationLog?.has(messageIdToDelete)).toBe(false);
      expect(conversationLog?.has(extraDirectMessageId)).toBe(true);
      expect(conversationLog?.has(directMessageFromOther1.messageId)).toBe(
        true,
      );
      expect(state.messages.direct.has(conversationId)).toBe(true);
    });

    it("should delete another specific direct message", () => {
      const messageIdToDelete = directMessageFromOther1.messageId;
      const nodeA = directMessageFromOther1.from;
      const nodeB = directMessageFromOther1.to;
      const conversationId = getConversationId(nodeA, nodeB);

      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: nodeA,
        nodeB: nodeB,
        messageId: messageIdToDelete,
      });

      const state = useMessageStore.getState();
      const conversationLog = state.messages.direct.get(conversationId);
      expect(conversationLog?.has(messageIdToDelete)).toBe(false);
      expect(conversationLog?.has(directMessageToOther1.messageId)).toBe(true);
      expect(conversationLog?.has(extraDirectMessageId)).toBe(true);
    });

    it("should delete a specific broadcast message", () => {
      const messageIdToDelete = broadcastMessage1.messageId;
      const channelId = broadcastMessage1.channel;

      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Broadcast,
        channelId: channelId,
        messageId: messageIdToDelete,
      });

      const state = useMessageStore.getState();
      expect(state.messages.broadcast.get(channelId)?.get(messageIdToDelete))
        .toBeUndefined();
    });

    it("should clean up empty conversation/channel Maps", () => {
      const directConvId = getConversationId(
        directMessageFromOther1.from,
        directMessageFromOther1.to,
      );
      const broadcastChanId = broadcastMessage1.channel;

      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: directMessageToOther1.from,
        nodeB: directMessageToOther1.to,
        messageId: directMessageToOther1.messageId,
      });
      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: directMessageFromOther1.from,
        nodeB: directMessageFromOther1.to,
        messageId: directMessageFromOther1.messageId,
      });
      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: directMessageToOther1.from,
        nodeB: directMessageToOther1.to,
        messageId: extraDirectMessageId,
      });

      expect(useMessageStore.getState().messages.direct.has(directConvId)).toBe(
        false,
      );

      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Broadcast,
        channelId: broadcastChanId,
        messageId: broadcastMessage1.messageId,
      });

      expect(useMessageStore.getState().messages.broadcast.has(broadcastChanId))
        .toBe(false);
    });

    it("should not error when trying to delete non-existent message", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const conversationId = getConversationId(myNodeNum, otherNodeNum1);

      expect(() => {
        useMessageStore.getState().clearMessageByMessageId({
          type: MessageType.Direct,
          nodeA: myNodeNum,
          nodeB: otherNodeNum1,
          messageId: 9999,
        });
      }).not.toThrow();

      const state = useMessageStore.getState();
      const conversationLog = state.messages.direct.get(conversationId);
      expect(conversationLog?.size).toBe(3); // 101, 102, 1011
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("not found in direct chat"),
      );

      warnSpy.mockRestore();
    });

    it("should not error when trying to delete from non-existent conversation/channel", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => {
        useMessageStore.getState().clearMessageByMessageId({
          type: MessageType.Direct,
          nodeA: myNodeNum,
          nodeB: 9998,
          messageId: 101,
        });
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Message entry"),
      );

      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });

  describe("Drafts", () => {
    const draftKeyDirect = otherNodeNum1;
    const draftKeyBroadcast = broadcastChannel;
    const draftMessage = "This is a draft";

    it("should set and get a draft for direct chat", () => {
      useMessageStore.getState().setDraft(draftKeyDirect, draftMessage);
      expect(useMessageStore.getState().draft.get(draftKeyDirect)).toBe(
        draftMessage,
      );
      expect(useMessageStore.getState().getDraft(draftKeyDirect)).toBe(
        draftMessage,
      );
    });

    it("should set and get a draft for broadcast chat", () => {
      useMessageStore.getState().setDraft(draftKeyBroadcast, draftMessage);
      expect(useMessageStore.getState().draft.get(draftKeyBroadcast)).toBe(
        draftMessage,
      );
      expect(useMessageStore.getState().getDraft(draftKeyBroadcast)).toBe(
        draftMessage,
      );
    });

    it("should return empty string for non-existent draft", () => {
      expect(useMessageStore.getState().getDraft(999)).toBe("");
    });

    it("should clear a draft", () => {
      useMessageStore.getState().setDraft(draftKeyDirect, draftMessage);
      expect(useMessageStore.getState().draft.has(draftKeyDirect)).toBe(true);
      useMessageStore.getState().clearDraft(draftKeyDirect);
      expect(useMessageStore.getState().draft.has(draftKeyDirect)).toBe(false);
      expect(useMessageStore.getState().getDraft(draftKeyDirect)).toBe("");
    });
  });

  describe("deleteAllMessages", () => {
    it("should clear all direct and broadcast messages, leaving empty Maps", () => {
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(broadcastMessage1);

      expect(useMessageStore.getState().messages.direct.size).toBeGreaterThan(
        0,
      );
      expect(useMessageStore.getState().messages.broadcast.size)
        .toBeGreaterThan(0);

      useMessageStore.getState().deleteAllMessages();

      const state = useMessageStore.getState();
      expect(state.messages.direct).toBeInstanceOf(Map);
      expect(state.messages.direct.size).toBe(0);
      expect(state.messages.broadcast).toBeInstanceOf(Map);
      expect(state.messages.broadcast.size).toBe(0);
    });
  });
});
