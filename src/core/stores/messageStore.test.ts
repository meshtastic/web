import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useMessageStore,
  MessageType,
  MessageState,
  type Message,
} from './messageStore.ts';

let memoryStorage: Record<string, string> = {};

vi.mock('./storage/indexDB.ts', () => {
  return {
    zustandIndexDBStorage: {
      getItem: vi.fn(async (name: string): Promise<string | null> => {
        return memoryStorage[name] ?? null;
      }),
      setItem: vi.fn(async (name: string, value: string): Promise<void> => {
        memoryStorage[name] = value;
      }),
      removeItem: vi.fn(async (name: string): Promise<void> => {
        delete memoryStorage[name];
      }),
    },
  };
});

const myNodeNum = 111;
const otherNodeNum1 = 222;
const otherNodeNum2 = 333;
const broadcastChannel = 0;



const directMessageToOther1: Message = {
  type: MessageType.Direct,
  from: myNodeNum,
  to: otherNodeNum1,
  channel: 0,
  date: Date.now(),
  messageId: 101,
  state: MessageState.Waiting,
  message: 'Hello other 1 from me',
};

const directMessageFromOther1: Message = {
  type: MessageType.Direct,
  from: otherNodeNum1,
  to: myNodeNum,
  channel: 0,
  date: Date.now() + 1000,
  messageId: 102,
  state: MessageState.Waiting,
  message: 'Hello me from other 1',
};

const directMessageToOther2: Message = {
  type: MessageType.Direct,
  from: myNodeNum,
  to: otherNodeNum2,
  channel: 0,
  date: Date.now() + 2000,
  messageId: 103,
  state: MessageState.Waiting,
  message: 'Hello other 2 from me',
};

const broadcastMessage1: Message = {
  type: MessageType.Broadcast,
  from: otherNodeNum1,
  to: 0xffffffff,
  channel: broadcastChannel,
  date: Date.now() + 3000,
  messageId: 201,
  state: MessageState.Waiting,
  message: 'Broadcast message 1',
};

const broadcastMessage2: Message = {
  type: MessageType.Broadcast,
  from: myNodeNum,
  to: 0xffffffff,
  channel: broadcastChannel,
  date: Date.now() + 4000,
  messageId: 202,
  state: MessageState.Waiting,
  message: 'Broadcast message 2',
};

describe('useMessageStore', () => {
  const initialState = useMessageStore.getState();

  beforeEach(() => {
    useMessageStore.setState(initialState, true);
  });

  it('should have correct initial state', () => {
    const state = useMessageStore.getState();
    expect(state.messages.direct).toEqual({});
    expect(state.messages.broadcast).toEqual({});
    expect(state.draft).toBeInstanceOf(Map);
    expect(state.draft.size).toBe(0);
    expect(state.nodeNum).toBe(0);
    expect(state.activeChat).toBe(0);
    expect(state.chatType).toBe(MessageType.Broadcast);
  });

  it('should set nodeNum', () => {
    useMessageStore.getState().setNodeNum(myNodeNum);
    expect(useMessageStore.getState().nodeNum).toBe(myNodeNum);
  });

  it('should set activeChat and chatType', () => {
    useMessageStore.getState().setActiveChat(otherNodeNum1);
    useMessageStore.getState().setChatType(MessageType.Direct);
    expect(useMessageStore.getState().activeChat).toBe(otherNodeNum1);
    expect(useMessageStore.getState().chatType).toBe(MessageType.Direct);
  });

  describe('saveMessage', () => {
    it('should save a direct message with correct structure', () => {
      useMessageStore.getState().saveMessage(directMessageToOther1);
      const state = useMessageStore.getState();
      expect(state.messages.direct[myNodeNum]).toBeDefined();
      expect(state.messages.direct[myNodeNum][otherNodeNum1]).toBeDefined();
      expect(
        state.messages.direct[myNodeNum][otherNodeNum1][directMessageToOther1.messageId],
      ).toEqual(directMessageToOther1);
    });

    it('should save a broadcast message with correct structure', () => {
      useMessageStore.getState().saveMessage(broadcastMessage1);
      const state = useMessageStore.getState();
      expect(state.messages.broadcast[broadcastChannel]).toBeDefined();
      expect(
        state.messages.broadcast[broadcastChannel][broadcastMessage1.messageId],
      ).toEqual(broadcastMessage1);
    });

    it('should save multiple messages correctly', () => {
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(directMessageFromOther1);
      useMessageStore.getState().saveMessage(broadcastMessage1);

      const state = useMessageStore.getState();

      // Direct msg 1 (me -> other1)
      expect(state.messages.direct[myNodeNum]?.[otherNodeNum1]?.[directMessageToOther1.messageId]).toEqual(directMessageToOther1);
      // Direct msg 2 (other1 -> me)
      expect(state.messages.direct[otherNodeNum1]?.[myNodeNum]?.[directMessageFromOther1.messageId]).toEqual(directMessageFromOther1);
      // Broadcast msg 1
      expect(state.messages.broadcast[broadcastChannel]?.[broadcastMessage1.messageId]).toEqual(broadcastMessage1);
    });
  });

  describe('getMessages', () => {
    beforeEach(() => {
      useMessageStore.getState().setNodeNum(myNodeNum);
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(directMessageFromOther1);
      useMessageStore.getState().saveMessage(directMessageToOther2);
      useMessageStore.getState().saveMessage(broadcastMessage1);
      useMessageStore.getState().saveMessage(broadcastMessage2);
    });

    it('should return broadcast messages for a channel, sorted by date', () => {
      const messages = useMessageStore.getState().getMessages(MessageType.Broadcast, {
        myNodeNum: myNodeNum, // Not strictly needed for broadcast, but good practice
        channel: broadcastChannel
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(broadcastMessage1);
      expect(messages[1]).toEqual(broadcastMessage2);
    });

    it('should return empty array for broadcast if channel has no messages', () => {
      const messages = useMessageStore.getState().getMessages(MessageType.Broadcast, {
        myNodeNum: myNodeNum,
        channel: 99
      });
      expect(messages).toEqual([]);
    });

    it('should return combined direct messages for a specific chat (pair), sorted by date', () => {
      const messages = useMessageStore.getState().getMessages(MessageType.Direct, {
        myNodeNum: myNodeNum,
        otherNodeNum: otherNodeNum1
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(directMessageToOther1);
      expect(messages[1]).toEqual(directMessageFromOther1);
    });

    it('should return only relevant direct messages for a different chat pair', () => {
      const messages = useMessageStore.getState().getMessages(MessageType.Direct, {
        myNodeNum: myNodeNum,
        otherNodeNum: otherNodeNum2
      });
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(directMessageToOther2);
    });

    it('should return empty array for direct chat if no messages exist', () => {
      const messages = useMessageStore.getState().getMessages(MessageType.Direct, {
        myNodeNum: myNodeNum,
        otherNodeNum: 999
      });
      expect(messages).toEqual([]);
    });

    it('should return combined direct messages when myNodeNum and otherNodeNum are provided', () => {
      const messages = useMessageStore.getState().getMessages(MessageType.Direct, {
        myNodeNum: myNodeNum,         // Keep this
        otherNodeNum: otherNodeNum1
      });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(directMessageToOther1);
      expect(messages[1]).toEqual(directMessageFromOther1);
    });
  });

  describe('setMessageState', () => {
    beforeEach(() => {
      useMessageStore.getState().setNodeNum(myNodeNum);
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(directMessageFromOther1);
      useMessageStore.getState().saveMessage(broadcastMessage1);
    });

    it('should update state for a direct message sent BY ME', () => {
      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        key: otherNodeNum1,
        messageId: directMessageToOther1.messageId,
        newState: MessageState.Ack,
      });
      const message = useMessageStore.getState().messages.direct[myNodeNum]?.[otherNodeNum1]?.[directMessageToOther1.messageId];
      expect(message?.state).toBe(MessageState.Ack);
    });

    it('should update state for a direct message received FROM OTHER', () => {
      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        key: otherNodeNum1,
        messageId: directMessageFromOther1.messageId,
        newState: MessageState.Failed,
      });
      const message = useMessageStore.getState().messages.direct[otherNodeNum1]?.[myNodeNum]?.[directMessageFromOther1.messageId];
      expect(message?.state).toBe(MessageState.Failed);
    });

    it('should update state for a broadcast message', () => {
      useMessageStore.getState().setMessageState({
        type: MessageType.Broadcast,
        key: broadcastChannel,
        messageId: broadcastMessage1.messageId,
        newState: MessageState.Ack,
      });
      const message = useMessageStore.getState().messages.broadcast[broadcastChannel]?.[broadcastMessage1.messageId];
      expect(message?.state).toBe(MessageState.Ack);
    });

    it('should warn if message is not found', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        key: otherNodeNum1,
        messageId: 999,
        newState: MessageState.Ack,
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Message not found for state update'));
      warnSpy.mockRestore();
    });
  });


  describe('clearMessageByMessageId', () => {
    beforeEach(() => {
      useMessageStore.getState().setNodeNum(myNodeNum);
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(directMessageFromOther1);
      useMessageStore.getState().saveMessage(broadcastMessage1);
      useMessageStore.getState().saveMessage({ ...directMessageToOther1, messageId: 1011, date: Date.now() + 50 });
    });

    it('should delete a specific direct message (sent by me)', () => {
      const messageIdToDelete = directMessageToOther1.messageId;
      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Direct,
        from: myNodeNum,
        to: otherNodeNum1,
        messageId: messageIdToDelete
      });
      const state = useMessageStore.getState();
      expect(state.messages.direct[myNodeNum]?.[otherNodeNum1]?.[messageIdToDelete]).toBeUndefined();
      expect(state.messages.direct[myNodeNum]?.[otherNodeNum1]?.[1011]).toBeDefined();
      expect(state.messages.direct[otherNodeNum1]?.[myNodeNum]?.[directMessageFromOther1.messageId]).toBeDefined();
    });

    it('should delete a specific direct message (sent by other)', () => {
      const messageIdToDelete = directMessageFromOther1.messageId;
      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Direct,
        from: otherNodeNum1,
        to: myNodeNum,
        messageId: messageIdToDelete
      });
      const state = useMessageStore.getState();
      expect(state.messages.direct[otherNodeNum1]?.[myNodeNum]?.[messageIdToDelete]).toBeUndefined();
      expect(state.messages.direct[myNodeNum]?.[otherNodeNum1]?.[directMessageToOther1.messageId]).toBeDefined();
      expect(state.messages.direct[myNodeNum]?.[otherNodeNum1]?.[1011]).toBeDefined();
    });

    it('should delete a specific broadcast message', () => {
      const messageIdToDelete = broadcastMessage1.messageId;
      useMessageStore.getState().clearMessageByMessageId({
        type: MessageType.Broadcast,
        channel: broadcastChannel,
        messageId: messageIdToDelete
      });
      const state = useMessageStore.getState();
      expect(state.messages.broadcast[broadcastChannel]?.[messageIdToDelete]).toBeUndefined();
    });

    it('should clean up empty to/from/channel objects', () => {
      useMessageStore.getState().clearMessageByMessageId({ type: MessageType.Direct, from: otherNodeNum1, to: myNodeNum, messageId: directMessageFromOther1.messageId });
      expect(useMessageStore.getState().messages.direct[otherNodeNum1]?.[myNodeNum]).toBeUndefined(); // Recipient level removed
      expect(useMessageStore.getState().messages.direct[otherNodeNum1]).toBeUndefined(); // Sender level removed

      useMessageStore.getState().clearMessageByMessageId({ type: MessageType.Broadcast, channel: broadcastChannel, messageId: broadcastMessage1.messageId });
      expect(useMessageStore.getState().messages.broadcast[broadcastChannel]).toBeUndefined(); // Channel level removed
    });
  });

  describe('Drafts', () => {
    const draftKey = otherNodeNum1;
    const draftMessage = 'This is a draft';

    it('should set and get a draft', () => {
      useMessageStore.getState().setDraft(draftKey, draftMessage);
      expect(useMessageStore.getState().draft.get(draftKey)).toBe(draftMessage);
      expect(useMessageStore.getState().getDraft(draftKey)).toBe(draftMessage);
    });

    it('should return empty string for non-existent draft', () => {
      expect(useMessageStore.getState().getDraft(999)).toBe('');
    });

    it('should clear a draft', () => {
      useMessageStore.getState().setDraft(draftKey, draftMessage);
      expect(useMessageStore.getState().draft.has(draftKey)).toBe(true);
      useMessageStore.getState().clearDraft(draftKey);
      expect(useMessageStore.getState().draft.has(draftKey)).toBe(false);
      expect(useMessageStore.getState().getDraft(draftKey)).toBe('');
    });
  });

  describe('deleteAllMessages', () => {
    it('should clear all direct and broadcast messages', () => {
      useMessageStore.getState().saveMessage(directMessageToOther1);
      useMessageStore.getState().saveMessage(broadcastMessage1);
      expect(Object.keys(useMessageStore.getState().messages.direct).length).toBeGreaterThan(0);
      expect(Object.keys(useMessageStore.getState().messages.broadcast).length).toBeGreaterThan(0);

      useMessageStore.getState().deleteAllMessages();

      expect(useMessageStore.getState().messages.direct).toEqual({});
      expect(useMessageStore.getState().messages.broadcast).toEqual({});
    });
  });

});
