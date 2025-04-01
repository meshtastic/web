import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageStore, Message, MessageState, MessageType } from './messageStore.ts';
import { Types } from '@meshtastic/core';

vi.mock('./storage/indexDB.ts', () => ({
  zustandIndexDBStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

beforeEach(() => {
  useMessageStore.setState({
    messages: { direct: {}, broadcast: {} },
    draft: new Map<Types.Destination, string>(),
    nodeNum: 0,
    activeChat: 0,
    chatType: MessageType.Broadcast,
  });
});

describe('useMessageStore', () => {
  it('sets and gets nodeNum', () => {
    useMessageStore.getState().setNodeNum(42);
    expect(useMessageStore.getState().getNodeNum()).toBe(42);
  });

  it('sets activeChat', () => {
    useMessageStore.getState().setActiveChat(123);
    expect(useMessageStore.getState().activeChat).toBe(123);
  });

  it('sets chatType', () => {
    useMessageStore.getState().setChatType(MessageType.Direct);
    expect(useMessageStore.getState().chatType).toBe(MessageType.Direct);
  });

  describe('saveMessage', () => {
    it('saves a direct message', () => {
      const message: Message = {
        type: MessageType.Direct,
        channel: 0,
        to: 101,
        from: 202,
        date: Date.now(),
        messageId: 1,
        state: MessageState.Waiting,
        message: 'Hello Direct',
      };
      useMessageStore.getState().saveMessage(message);
      expect(useMessageStore.getState().messages.direct[101]?.[1]).toEqual(message);
    });

    it('saves a broadcast message', () => {
      const message: Message = {
        type: MessageType.Broadcast,
        channel: 5,
        to: 0,
        from: 303,
        date: Date.now(),
        messageId: 100,
        state: MessageState.Waiting,
        message: 'Broadcast Message',
      };
      useMessageStore.getState().saveMessage(message);
      expect(useMessageStore.getState().messages.broadcast[5]?.[100]).toEqual(message);
    });

    it('ensures date is stored as milliseconds', () => {
      const now = Date.now();
      const message: Message = {
        type: MessageType.Direct,
        channel: 0,
        to: 101,
        from: 202,
        date: now,
        messageId: 1,
        state: MessageState.Waiting,
        message: 'Hello Direct',
      };
      useMessageStore.getState().saveMessage(message);
      expect(useMessageStore.getState().messages.direct[101]?.[1]?.date).toBe(new Date(now).getTime());
    });
  });

  describe('setMessageState', () => {
    it('updates the state of an existing direct message', () => {
      const message: Message = {
        type: MessageType.Direct,
        channel: 0,
        to: 101,
        from: 202,
        date: Date.now(),
        messageId: 1,
        state: MessageState.Waiting,
        message: 'Change me',
      };
      useMessageStore.getState().saveMessage(message);

      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        key: 101,
        messageId: 1,
        newState: MessageState.Ack,
      });

      expect(useMessageStore.getState().messages.direct[101]?.[1]?.state).toBe(MessageState.Ack);
    });

    it('updates the state of an existing broadcast message', () => {
      const message: Message = {
        type: MessageType.Broadcast,
        channel: 5,
        to: 0,
        from: 303,
        date: Date.now(),
        messageId: 100,
        state: MessageState.Waiting,
        message: 'Broadcast Message',
      };
      useMessageStore.getState().saveMessage(message);

      useMessageStore.getState().setMessageState({
        type: MessageType.Broadcast,
        key: 5,
        messageId: 100,
        newState: MessageState.Failed,
      });

      expect(useMessageStore.getState().messages.broadcast[5]?.[100]?.state).toBe(MessageState.Failed);
    });

    it('does not update if the message is not found and logs a warning', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      useMessageStore.getState().setMessageState({
        type: MessageType.Direct,
        key: 999,
        messageId: 99,
        newState: MessageState.Ack,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Message not found - type: direct, key: 999, messageId: 99',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  it('clears all messages', () => {
    useMessageStore.getState().saveMessage({
      type: MessageType.Broadcast,
      channel: 5,
      to: 0,
      from: 303,
      date: Date.now(),
      messageId: 100,
      state: MessageState.Waiting,
      message: 'Broadcast Message',
    });
    useMessageStore.getState().saveMessage({
      type: MessageType.Direct,
      channel: 0,
      to: 101,
      from: 202,
      date: Date.now(),
      messageId: 1,
      state: MessageState.Waiting,
      message: 'Hello Direct',
    });
    useMessageStore.getState().clearAllMessages();
    expect(useMessageStore.getState().messages.direct).toEqual({});
    expect(useMessageStore.getState().messages.broadcast).toEqual({});
  });

  describe('getMessages', () => {
    it('retrieves sorted broadcast messages for a channel', () => {
      const now = Date.now();
      const earlier = now - 10000;
      const later = now;

      useMessageStore.getState().saveMessage({
        type: MessageType.Broadcast,
        channel: 4,
        to: 0,
        from: 404,
        date: later,
        messageId: 2,
        state: MessageState.Waiting,
        message: 'Second',
      });
      useMessageStore.getState().saveMessage({
        type: MessageType.Broadcast,
        channel: 4,
        to: 0,
        from: 404,
        date: earlier,
        messageId: 1,
        state: MessageState.Waiting,
        message: 'First',
      });

      const messages = useMessageStore.getState().getMessages(MessageType.Broadcast, { channel: 4 });
      expect(messages.map((m) => m.message)).toEqual(['First', 'Second']);
      expect(messages[0]?.date).toBe(earlier);
      expect(messages[1]?.date).toBe(later);
    });

    it('returns an empty array for broadcast messages if channel does not exist', () => {
      const messages = useMessageStore.getState().getMessages(MessageType.Broadcast, { channel: 99 });
      expect(messages).toEqual([]);
    });

    it('merges and sorts direct messages by date', () => {
      const myNodeNum = 1;
      const otherNodeNum = 2;
      const now = Date.now();
      const earlier = now - 10000;
      const later = now + 10000;

      const incomingMessage: Message = {
        type: MessageType.Direct,
        channel: 0,
        to: myNodeNum,
        from: otherNodeNum,
        date: earlier,
        messageId: 1,
        state: MessageState.Ack,
        message: 'Incoming from 2',
      };
      useMessageStore.getState().saveMessage(incomingMessage);

      const outgoingMessage: Message = {
        type: MessageType.Direct,
        channel: 0,
        to: otherNodeNum,
        from: myNodeNum,
        date: later,
        messageId: 2,
        state: MessageState.Waiting,
        message: 'Outgoing from 1',
      };
      useMessageStore.getState().saveMessage(outgoingMessage);

      const merged = useMessageStore.getState().getMessages(MessageType.Direct, {
        myNodeNum: myNodeNum,
        otherNodeNum: otherNodeNum,
      });

      expect(merged.length).toBe(2);
      expect(merged.map((m) => m.message)).toEqual(['Incoming from 2', 'Outgoing from 1']);
      expect(merged[0]?.date).toBe(earlier);
      expect(merged[1]?.date).toBe(later);
    });

    it('returns an empty array for direct messages if no messages exist between nodes', () => {
      const myNodeNum = 1;
      const otherNodeNum = 2;
      const messages = useMessageStore.getState().getMessages(MessageType.Direct, {
        myNodeNum: myNodeNum,
        otherNodeNum: otherNodeNum,
      });
      expect(messages).toEqual([]);
    });
  });

  describe('draft functionality', () => {
    it('sets and gets a draft message', () => {
      const key: Types.Destination = 123;
      useMessageStore.getState().setDraft(key, 'Draft text');
      expect(useMessageStore.getState().getDraft(key)).toBe('Draft text');
    });

    it('gets an empty string if no draft exists for a key', () => {
      const key: Types.Destination = 456;
      expect(useMessageStore.getState().getDraft(key)).toBe('');
    });

    it('clears a draft message', () => {
      const key: Types.Destination = 123;
      useMessageStore.getState().setDraft(key, 'Draft to clear');
      useMessageStore.getState().clearDraft(key);
      expect(useMessageStore.getState().getDraft(key)).toBe('');
    });
  });

  describe('clearMessageByMessageId', () => {
    it('clears a direct message by messageId', () => {
      const message: Message = {
        type: MessageType.Direct,
        channel: 0,
        to: 111,
        from: 222,
        date: Date.now(),
        messageId: 42,
        state: MessageState.Waiting,
        message: 'To be deleted',
      };
      useMessageStore.getState().saveMessage(message);
      expect(useMessageStore.getState().messages.direct[111]?.[42]).toBeDefined();

      useMessageStore.getState().clearMessageByMessageId(MessageType.Direct, 42);

      expect(useMessageStore.getState().messages.direct[111]?.[42]).toBeUndefined();
      expect(useMessageStore.getState().messages.direct[111]).toBeUndefined();
    });

    it('clears a broadcast message by messageId', () => {
      const message: Message = {
        type: MessageType.Broadcast,
        channel: 2,
        to: 0,
        from: 333,
        date: Date.now(),
        messageId: 77,
        state: MessageState.Waiting,
        message: 'Broadcast to delete',
      };
      useMessageStore.getState().saveMessage(message);
      expect(useMessageStore.getState().messages.broadcast[2]?.[77]).toBeDefined();

      useMessageStore.getState().clearMessageByMessageId(MessageType.Broadcast, 77);

      expect(useMessageStore.getState().messages.broadcast[2]?.[77]).toBeUndefined();
      expect(useMessageStore.getState().messages.broadcast[2]).toBeUndefined();
    });

    it('does not throw error if trying to clear a non-existent message', () => {
      expect(() => {
        useMessageStore.getState().clearMessageByMessageId(MessageType.Direct, 999);
        useMessageStore.getState().clearMessageByMessageId(MessageType.Broadcast, 999);
      }).not.toThrow();
    });
  });
});