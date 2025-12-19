import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DB_EVENTS, dbEvents } from "../events.ts";
import { messageRepo } from "../repositories/index.ts";
import {
  useAllMessages,
  useBroadcastMessages,
  useConversations,
  useDirectMessages,
  usePendingMessages,
} from "./useMessages.ts";

// Mock dependencies
vi.mock("../repositories", () => ({
  messageRepo: {
    getDirectMessages: vi.fn(),
    getBroadcastMessages: vi.fn(),
    getAllMessages: vi.fn(),
    getPendingMessages: vi.fn(),
    getConversations: vi.fn(),
  },
}));

vi.mock("../events", () => ({
  dbEvents: {
    subscribe: vi.fn(),
  },
  DB_EVENTS: {
    MESSAGE_SAVED: "MESSAGE_SAVED",
  },
}));

describe("useMessages hooks", () => {
  const deviceId = 123;
  const mockMessages = [{ id: 1, message: "test" }];

  beforeEach(() => {
    vi.clearAllMocks();
    (dbEvents.subscribe as vi.Mock).mockReturnValue(vi.fn());
  });

  describe("useDirectMessages", () => {
    it("should fetch direct messages and subscribe to updates", async () => {
      (messageRepo.getDirectMessages as vi.Mock).mockResolvedValue(
        mockMessages,
      );

      const { result } = renderHook(() => useDirectMessages(deviceId, 1, 2));

      await waitFor(() => {
        expect(result.current.messages).toEqual(mockMessages);
      });

      expect(messageRepo.getDirectMessages).toHaveBeenCalledWith(
        deviceId,
        1,
        2,
        50,
      );
      expect(dbEvents.subscribe).toHaveBeenCalledWith(
        DB_EVENTS.MESSAGE_SAVED,
        expect.any(Function),
      );
    });
  });

  describe("useBroadcastMessages", () => {
    it("should fetch broadcast messages and subscribe to updates", async () => {
      (messageRepo.getBroadcastMessages as vi.Mock).mockResolvedValue(
        mockMessages,
      );

      const { result } = renderHook(() => useBroadcastMessages(deviceId, 0));

      await waitFor(() => {
        expect(result.current.messages).toEqual(mockMessages);
      });

      expect(messageRepo.getBroadcastMessages).toHaveBeenCalledWith(
        deviceId,
        0,
        50,
      );
      expect(dbEvents.subscribe).toHaveBeenCalledWith(
        DB_EVENTS.MESSAGE_SAVED,
        expect.any(Function),
      );
    });
  });

  describe("useAllMessages", () => {
    it("should fetch all messages with pagination", async () => {
      (messageRepo.getAllMessages as vi.Mock).mockResolvedValue(mockMessages);

      const { result } = renderHook(() => useAllMessages(deviceId));

      await waitFor(() => {
        expect(result.current.messages).toEqual(mockMessages);
      });

      expect(messageRepo.getAllMessages).toHaveBeenCalledWith(deviceId, 100, 0);
    });
  });

  describe("usePendingMessages", () => {
    it("should fetch pending messages", async () => {
      (messageRepo.getPendingMessages as vi.Mock).mockResolvedValue(
        mockMessages,
      );

      const { result } = renderHook(() => usePendingMessages(deviceId));

      await waitFor(() => {
        expect(result.current.messages).toEqual(mockMessages);
      });

      expect(messageRepo.getPendingMessages).toHaveBeenCalledWith(deviceId);
    });
  });

  describe("useConversations", () => {
    it("should fetch conversations", async () => {
      const mockConversations = [{ id: 1, type: "direct", unreadCount: 0 }];
      (messageRepo.getConversations as vi.Mock).mockResolvedValue(
        mockConversations,
      );

      const { result } = renderHook(() => useConversations(deviceId));

      await waitFor(() => {
        expect(result.current.conversations).toEqual(mockConversations);
      });

      expect(messageRepo.getConversations).toHaveBeenCalledWith(deviceId);
    });
  });
});
