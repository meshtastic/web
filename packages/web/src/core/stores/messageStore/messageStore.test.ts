/** biome-ignore-all lint/style/noNonNullAssertion: <tests> */
import { Types } from "@meshtastic/core";
import { setAutoFreeze } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConversationId, MessageState, MessageType } from "./index.ts";
import type { ChannelId, Message } from "./types.ts";

const idbMem = new Map<string, string>();
vi.mock("idb-keyval", () => ({
  get: vi.fn((key: string) => Promise.resolve(idbMem.get(key))),
  set: vi.fn((key: string, val: string) => {
    idbMem.set(key, val);
    return Promise.resolve();
  }),
  del: vi.fn((k: string) => {
    idbMem.delete(k);
    return Promise.resolve();
  }),
}));

async function freshStore(persist = false) {
  vi.resetModules();

  // suppress console output from the store during tests (for github actions)
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});

  // Mock feature flag for persistence
  vi.doMock("@core/services/featureFlags", () => ({
    featureFlags: {
      get: vi.fn((key: string) =>
        key === "persistMessages" ? persist : false,
      ),
    },
  }));

  const mod = await import("./index.ts");
  return mod;
}

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

describe("MessageStore persistence & rehydrate", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("should have correct initial state", async () => {
    const { useMessageStore } = await freshStore();
    const state = useMessageStore.getState();
    const store = state.addMessageStore(123);

    expect(store.messages.direct).toBeInstanceOf(Map);
    expect(store.messages.direct.size).toBe(0);
    expect(store.messages.broadcast).toBeInstanceOf(Map);
    expect(store.messages.broadcast.size).toBe(0);
    expect(store.drafts).toBeInstanceOf(Map);
    expect(store.drafts.size).toBe(0);
    expect(store.myNodeNum).toBe(undefined);
    expect(store.activeChat).toBe(0);
    expect(store.chatType).toBe(MessageType.Broadcast);
  });

  it("should set nodeNum", async () => {
    const { useMessageStore } = await freshStore();
    const state = useMessageStore.getState();
    const db = state.addMessageStore(123);

    db.setNodeNum(myNodeNum);
    expect(useMessageStore.getState().getMessageStore(123)?.myNodeNum).toBe(
      myNodeNum,
    );
  });

  describe("saveMessage", async () => {
    const { useMessageStore } = await freshStore();
    const state = useMessageStore.getState();
    state.addMessageStore(123);

    it("should save a direct message with correct Map structure", () => {
      state.getMessageStore(123)?.saveMessage(directMessageToOther1);
      const conversationId = getConversationId(
        directMessageToOther1.from,
        directMessageToOther1.to,
      );

      const store = state.getMessageStore(123)!;

      // Check if the conversation Map exists
      expect(store.messages.direct.has(conversationId)).toBe(true);
      const conversationLog = store.messages.direct.get(conversationId);
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
      state.getMessageStore(123)?.saveMessage(broadcastMessage1);
      const store = state.getMessageStore(123)!;
      const channelId = broadcastMessage1.channel;

      expect(store.messages.broadcast.has(channelId)).toBe(true);
      const channelLog = store.messages.broadcast.get(channelId);
      expect(channelLog).toBeInstanceOf(Map);
      expect(channelLog?.has(broadcastMessage1.messageId)).toBe(true);
      expect(channelLog?.get(broadcastMessage1.messageId)).toEqual(
        broadcastMessage1,
      );
    });

    it("should save multiple messages correctly", () => {
      state.getMessageStore(123)?.saveMessage(directMessageToOther1);
      state.getMessageStore(123)?.saveMessage(directMessageFromOther1);
      state.getMessageStore(123)?.saveMessage(broadcastMessage1);

      const store = state.getMessageStore(123)!;

      const convId1 = getConversationId(myNodeNum, otherNodeNum1);
      expect(
        store.messages.direct
          .get(convId1)
          ?.get(directMessageToOther1.messageId),
      ).toEqual(directMessageToOther1);

      expect(
        store.messages.direct
          .get(convId1)
          ?.get(directMessageFromOther1.messageId),
      ).toEqual(directMessageFromOther1);

      const channelId = broadcastMessage1.channel;
      expect(
        store.messages.broadcast
          .get(channelId)
          ?.get(broadcastMessage1.messageId),
      ).toEqual(broadcastMessage1);
    });
  });

  describe("getMessages", async () => {
    const { useMessageStore } = await freshStore();
    const state = useMessageStore.getState();
    state.addMessageStore(123);

    beforeEach(() => {
      state.getMessageStore(123)?.setNodeNum(myNodeNum);
      state.getMessageStore(123)?.saveMessage(directMessageToOther1);
      state.getMessageStore(123)?.saveMessage(directMessageFromOther1);
      state.getMessageStore(123)?.saveMessage(directMessageToOther2);
      state.getMessageStore(123)?.saveMessage(broadcastMessage1);
      state.getMessageStore(123)?.saveMessage(broadcastMessage2);
    });

    it("should return broadcast messages for a channel, sorted by date", () => {
      const messages = state.getMessageStore(123)!.getMessages({
        type: MessageType.Broadcast,
        channelId: broadcastChannel,
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(broadcastMessage1);
      expect(messages[1]).toEqual(broadcastMessage2);
    });

    it("should return empty array for broadcast if channel has no messages", () => {
      const messages = state.getMessageStore(123)!.getMessages({
        type: MessageType.Broadcast,
        channelId: Types.ChannelNumber.Channel1,
      });
      expect(messages).toEqual([]);
    });

    it("should return combined direct messages for a specific chat pair, sorted by date", () => {
      const messages = state.getMessageStore(123)!.getMessages({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: otherNodeNum1,
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(directMessageToOther1);
      expect(messages[1]).toEqual(directMessageFromOther1);
    });

    it("should return only relevant direct messages for a different chat pair", () => {
      const messages = state.getMessageStore(123)!.getMessages({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: otherNodeNum2,
      });
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(directMessageToOther2);
    });

    it("should return empty array for direct chat if no messages exist", () => {
      const messages = state.getMessageStore(123)!.getMessages({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: 999,
      });
      expect(messages).toEqual([]);
    });
  });

  describe("setMessageState", async () => {
    const { useMessageStore } = await freshStore();
    const state = useMessageStore.getState();
    state.addMessageStore(123);

    beforeEach(() => {
      state.getMessageStore(123)?.setNodeNum(myNodeNum);
      state.getMessageStore(123)?.saveMessage(directMessageToOther1);
      state.getMessageStore(123)?.saveMessage(directMessageFromOther1);
      state.getMessageStore(123)?.saveMessage(broadcastMessage1);
    });

    it("should update state for a direct message", () => {
      state.getMessageStore(123)!.setMessageState({
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
      const message = useMessageStore
        .getState()
        .getMessageStore(123)!
        .messages.direct.get(conversationId)
        ?.get(directMessageToOther1.messageId);
      expect(message?.state).toBe(MessageState.Ack);
    });

    it("should update state for another direct message in the same conversation", () => {
      state.getMessageStore(123)!.setMessageState({
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
      const message = useMessageStore
        .getState()
        .getMessageStore(123)!
        .messages.direct.get(conversationId)
        ?.get(directMessageFromOther1.messageId);
      expect(message?.state).toBe(MessageState.Failed);
    });

    it("should update state for a broadcast message", () => {
      state.getMessageStore(123)!.setMessageState({
        type: MessageType.Broadcast,
        channelId: broadcastChannel,
        messageId: broadcastMessage1.messageId,
        newState: MessageState.Ack,
      });
      const message = useMessageStore
        .getState()
        .getMessageStore(123)!
        .messages.broadcast.get(broadcastChannel)
        ?.get(broadcastMessage1.messageId);
      expect(message?.state).toBe(MessageState.Ack);
    });

    it("should warn if message is not found (direct)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      state.getMessageStore(123)!.setMessageState({
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
      state.getMessageStore(123)!.setMessageState({
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
      state.getMessageStore(123)!.setMessageState({
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

  describe("clearMessageByMessageId", async () => {
    const { useMessageStore } = await freshStore();
    const state = useMessageStore.getState();
    state.addMessageStore(123);

    const extraDirectMessageId = 1011;
    beforeEach(() => {
      state.getMessageStore(123)?.setNodeNum(myNodeNum);
      state.getMessageStore(123)?.saveMessage(directMessageToOther1);
      state.getMessageStore(123)?.saveMessage(directMessageFromOther1);
      state.getMessageStore(123)?.saveMessage(broadcastMessage1);
      state.getMessageStore(123)?.saveMessage({
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

      state.getMessageStore(123)?.clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: nodeA,
        nodeB: nodeB,
        messageId: messageIdToDelete,
      });

      const store = useMessageStore.getState().getMessageStore(123)!;
      const conversationLog = store.messages.direct.get(conversationId);
      expect(conversationLog?.has(messageIdToDelete)).toBe(false);
      expect(conversationLog?.has(extraDirectMessageId)).toBe(true);
      expect(conversationLog?.has(directMessageFromOther1.messageId)).toBe(
        true,
      );
      expect(store.messages.direct.has(conversationId)).toBe(true);
    });

    it("should delete another specific direct message", () => {
      const messageIdToDelete = directMessageFromOther1.messageId;
      const nodeA = directMessageFromOther1.from;
      const nodeB = directMessageFromOther1.to;
      const conversationId = getConversationId(nodeA, nodeB);

      state.getMessageStore(123)?.clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: nodeA,
        nodeB: nodeB,
        messageId: messageIdToDelete,
      });

      const store = useMessageStore.getState().getMessageStore(123)!;
      const conversationLog = store.messages.direct.get(conversationId);
      expect(conversationLog?.has(messageIdToDelete)).toBe(false);
      expect(conversationLog?.has(directMessageToOther1.messageId)).toBe(true);
      expect(conversationLog?.has(extraDirectMessageId)).toBe(true);
    });

    it("should delete a specific broadcast message", () => {
      const messageIdToDelete = broadcastMessage1.messageId;
      const channelId = broadcastMessage1.channel;

      state.getMessageStore(123)?.clearMessageByMessageId({
        type: MessageType.Broadcast,
        channelId: channelId,
        messageId: messageIdToDelete,
      });

      const store = useMessageStore.getState().getMessageStore(123)!;
      expect(
        store.messages.broadcast.get(channelId)?.get(messageIdToDelete),
      ).toBeUndefined();
    });

    it("should clean up empty conversation/channel Maps", () => {
      const directConvId = getConversationId(
        directMessageFromOther1.from,
        directMessageFromOther1.to,
      );
      const broadcastChanId = broadcastMessage1.channel;

      state.getMessageStore(123)?.clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: directMessageToOther1.from,
        nodeB: directMessageToOther1.to,
        messageId: directMessageToOther1.messageId,
      });
      state.getMessageStore(123)?.clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: directMessageFromOther1.from,
        nodeB: directMessageFromOther1.to,
        messageId: directMessageFromOther1.messageId,
      });
      state.getMessageStore(123)?.clearMessageByMessageId({
        type: MessageType.Direct,
        nodeA: directMessageToOther1.from,
        nodeB: directMessageToOther1.to,
        messageId: extraDirectMessageId,
      });

      expect(
        state.getMessageStore(123)?.messages.direct.has(directConvId),
      ).toBe(false);

      state.getMessageStore(123)?.clearMessageByMessageId({
        type: MessageType.Broadcast,
        channelId: broadcastChanId,
        messageId: broadcastMessage1.messageId,
      });

      expect(
        state.getMessageStore(123)?.messages.broadcast.has(broadcastChanId),
      ).toBe(false);
    });

    it("should not error when trying to delete non-existent message", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const conversationId = getConversationId(myNodeNum, otherNodeNum1);

      expect(() => {
        state.getMessageStore(123)?.clearMessageByMessageId({
          type: MessageType.Direct,
          nodeA: myNodeNum,
          nodeB: otherNodeNum1,
          messageId: 9999,
        });
      }).not.toThrow();

      const store = useMessageStore.getState().getMessageStore(123)!;
      const conversationLog = store.messages.direct.get(conversationId);
      expect(conversationLog?.size).toBe(3); // 101, 102, 1011
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("not found in direct chat"),
      );

      warnSpy.mockRestore();
    });

    it("should not error when trying to delete from non-existent conversation/channel", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => {
        state.getMessageStore(123)?.clearMessageByMessageId({
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

  describe("Drafts", async () => {
    const { useMessageStore } = await freshStore();
    const state = useMessageStore.getState();
    state.addMessageStore(123);

    const draftKeyDirect = otherNodeNum1;
    const draftKeyBroadcast = broadcastChannel;
    const draftMessage = "This is a draft";

    it("should set and get a draft for direct chat", () => {
      state.getMessageStore(123)?.setDraft(draftKeyDirect, draftMessage);
      expect(state.getMessageStore(123)?.drafts.get(draftKeyDirect)).toBe(
        draftMessage,
      );
      expect(state.getMessageStore(123)?.getDraft(draftKeyDirect)).toBe(
        draftMessage,
      );
    });

    it("should set and get a draft for broadcast chat", () => {
      state.getMessageStore(123)?.setDraft(draftKeyBroadcast, draftMessage);
      expect(state.getMessageStore(123)?.drafts.get(draftKeyBroadcast)).toBe(
        draftMessage,
      );
      expect(state.getMessageStore(123)?.getDraft(draftKeyBroadcast)).toBe(
        draftMessage,
      );
    });

    it("should return empty string for non-existent draft", () => {
      expect(state.getMessageStore(123)?.getDraft(999)).toBe("");
    });

    it("should clear a draft", () => {
      state.getMessageStore(123)?.setDraft(draftKeyDirect, draftMessage);
      expect(state.getMessageStore(123)?.drafts.has(draftKeyDirect)).toBe(true);
      state.getMessageStore(123)?.clearDraft(draftKeyDirect);
      expect(state.getMessageStore(123)?.drafts.has(draftKeyDirect)).toBe(
        false,
      );
      expect(state.getMessageStore(123)?.getDraft(draftKeyDirect)).toBe("");
    });
  });

  describe("deleteAllMessages", async () => {
    const { useMessageStore } = await freshStore();
    const state = useMessageStore.getState();
    state.addMessageStore(123);

    it("should clear all direct and broadcast messages, leaving empty Maps", () => {
      state.getMessageStore(123)?.saveMessage(directMessageToOther1);
      state.getMessageStore(123)?.saveMessage(broadcastMessage1);

      expect(state.getMessageStore(123)?.messages.direct.size).toBeGreaterThan(
        0,
      );
      expect(
        state.getMessageStore(123)?.messages.broadcast.size,
      ).toBeGreaterThan(0);

      state.getMessageStore(123)?.deleteAllMessages();

      const store = useMessageStore.getState().getMessageStore(123)!;
      expect(store.messages.direct).toBeInstanceOf(Map);
      expect(store.messages.direct.size).toBe(0);
      expect(store.messages.broadcast).toBeInstanceOf(Map);
      expect(store.messages.broadcast.size).toBe(0);
    });
  });

  describe("persistence", () => {
    it("partialize persists data; onRehydrateStorage rebuilds methods (messages + drafts survive)", async () => {
      {
        const { useMessageStore } = await freshStore(true);
        const state = useMessageStore.getState();

        const store = state.addMessageStore(123);
        store.setNodeNum(321);

        const convId = getConversationId(myNodeNum, otherNodeNum1);
        store.saveMessage(directMessageToOther1);
        store.saveMessage(broadcastMessage1);
        store.setDraft(
          otherNodeNum1 as unknown as Types.Destination,
          "draft-text",
        );

        const store2 = state.addMessageStore(123);

        expect(store2.messages.direct.has(convId)).toBe(true);
        expect(store2.messages.direct.get(convId)?.has(101)).toBe(true);
        expect(store2.messages.broadcast.get(broadcastChannel)?.has(201)).toBe(
          true,
        );
        expect(
          store2.getDraft(otherNodeNum1 as unknown as Types.Destination),
        ).toBe("draft-text");
      }
      {
        const { useMessageStore } = await freshStore(true);
        const state = useMessageStore.getState();

        const store = state.getMessageStore(123)!; // rebuilt instance
        expect(store).toBeTruthy();

        // Methods should work after rehydrate
        const directMsgs = store.getMessages({
          type: MessageType.Direct,
          nodeA: myNodeNum,
          nodeB: otherNodeNum1,
        });
        expect(directMsgs.map((m) => m.messageId)).toEqual([101]);

        const bMsgs = store.getMessages({
          type: MessageType.Broadcast,
          channelId: broadcastChannel,
        });
        expect(bMsgs.map((m) => m.messageId)).toEqual([201]);

        expect(
          store.getDraft(otherNodeNum1 as unknown as Types.Destination),
        ).toBe("draft-text");

        store.saveMessage(directMessageFromOther1);

        const after = store.getMessages({
          type: MessageType.Direct,
          nodeA: myNodeNum,
          nodeB: otherNodeNum1,
        });
        expect(after.map((m) => m.messageId)).toEqual([101, 102]);
        expect(after[1]?.state).toBe(MessageState.Waiting);
      }
    });

    it("removeMessageStore persists removal across reload", async () => {
      {
        const { useMessageStore } = await freshStore(true);
        const state = useMessageStore.getState();
        const store = state.addMessageStore(99);

        store.setNodeNum(42);
        expect(state.getMessageStore(99)).toBeDefined();

        state.removeMessageStore(99);
        expect(state.getMessageStore(99)).toBeUndefined();
      }
      {
        const { useMessageStore } = await freshStore(true);
        const state = useMessageStore.getState();
        expect(state.getMessageStore(99)).toBeUndefined(); // still gone
      }
    });

    it("rehydrate only rebuilds stores with myNodeNum set (orphans dropped)", async () => {
      {
        const { useMessageStore } = await freshStore(true);
        const state = useMessageStore.getState();

        // Orphan (no myNodeNum)
        const orphan = state.addMessageStore(500);
        orphan.saveMessage(broadcastMessage1);

        // Proper store
        const good = state.addMessageStore(501);
        good.setNodeNum(777);
        good.saveMessage(broadcastMessage2);
      }
      {
        const { useMessageStore } = await freshStore(true);
        const state = useMessageStore.getState();

        expect(state.getMessageStore(500)).toBeUndefined(); // orphan dropped
        const kept = state.getMessageStore(501);
        expect(kept).toBeDefined();

        expect(kept?.messages.broadcast.get(broadcastChannel)?.has(202)).toBe(
          true,
        );
      }
    });

    it("evicts the earliest-added message store when exceeding cap of 10", async () => {
      const { useMessageStore } = await freshStore();
      const state = useMessageStore.getState();

      for (let i = 1; i <= 10; i++) {
        state.addMessageStore(i);
      }
      // Adding the 11th should evict the earliest (id=1)
      state.addMessageStore(11);

      expect(state.getMessageStore(1)).toBeUndefined(); // evicted
      expect(state.getMessageStore(2)).toBeDefined(); // still there
      expect(state.getMessageStore(11)).toBeDefined(); // newest kept
    });

    it("keeps only the latest 1000 messages in a broadcast channel (oldest trimmed)", async () => {
      setAutoFreeze(false); // Disable immer auto-freeze for performance in this test
      try {
        const { useMessageStore, MessageType, MessageState } =
          await freshStore();
        const state = useMessageStore.getState();

        const store = state.addMessageStore(123);

        const channelId = 0 as number;
        const total = 1005;

        for (let i = 1; i <= total; i++) {
          store.saveMessage({
            type: MessageType.Broadcast,
            from: 123,
            to: 0xffffffff,
            channel: channelId,
            date: Date.now() + i,
            messageId: i,
            state: MessageState.Waiting,
            message: `m${i}`,
          });
        }

        const fresh = useMessageStore.getState().getMessageStore(123)!;
        const log = fresh.messages.broadcast.get(channelId)!;

        expect(log.size).toBe(1000); // capped
        for (let i = 1; i <= 5; i++) {
          expect(log.has(i)).toBe(false); // oldest removed
        }
        for (let i = 6; i <= 1005; i++) {
          expect(log.has(i)).toBe(true); // newest kept
        }
      } finally {
        setAutoFreeze(true); // Restore immer auto-freeze
      }
    });
  });
});
