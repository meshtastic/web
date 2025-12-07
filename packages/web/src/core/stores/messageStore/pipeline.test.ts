import { describe, it, expect, vi, beforeEach } from "vitest";
import { create as createStore } from "zustand";
import { messageStoreInitializer } from "./index";
import type { OutgoingMessage, PipelineHandler } from "./types";

describe("MessageStore Pipeline", () => {
  let store: ReturnType<typeof createStore<ReturnType<typeof messageStoreInitializer>>>;
  let messageStore: ReturnType<ReturnType<typeof messageStoreInitializer>["addMessageStore"]>;

  beforeEach(() => {
    // Create a fresh store for each test
    store = createStore(messageStoreInitializer);
    messageStore = store.getState().addMessageStore(1);
  });

  describe("registerPipelineHandler", () => {
    it("should register a pipeline handler", () => {
      const handler: PipelineHandler = vi.fn();

      messageStore.registerPipelineHandler("testHandler", handler);

      // Get fresh state after mutation
      const updatedStore = store.getState().getMessageStore(1);
      expect(updatedStore?.pipelineHandlers.has("testHandler")).toBe(true);
      expect(updatedStore?.pipelineHandlers.get("testHandler")).toBe(handler);
    });

    it("should allow multiple handlers to be registered", () => {
      const handler1: PipelineHandler = vi.fn();
      const handler2: PipelineHandler = vi.fn();

      messageStore.registerPipelineHandler("handler1", handler1);
      messageStore.registerPipelineHandler("handler2", handler2);

      // Get fresh state after mutations
      const updatedStore = store.getState().getMessageStore(1);
      expect(updatedStore?.pipelineHandlers.size).toBe(2);
      expect(updatedStore?.pipelineHandlers.has("handler1")).toBe(true);
      expect(updatedStore?.pipelineHandlers.has("handler2")).toBe(true);
    });

    it("should replace handler if registered with same name", () => {
      const handler1: PipelineHandler = vi.fn();
      const handler2: PipelineHandler = vi.fn();

      messageStore.registerPipelineHandler("testHandler", handler1);
      messageStore.registerPipelineHandler("testHandler", handler2);

      // Get fresh state after mutations
      const updatedStore = store.getState().getMessageStore(1);
      expect(updatedStore?.pipelineHandlers.size).toBe(1);
      expect(updatedStore?.pipelineHandlers.get("testHandler")).toBe(handler2);
    });
  });

  describe("unregisterPipelineHandler", () => {
    it("should unregister a pipeline handler", () => {
      const handler: PipelineHandler = vi.fn();

      messageStore.registerPipelineHandler("testHandler", handler);

      // Get fresh state after registration
      let updatedStore = store.getState().getMessageStore(1);
      expect(updatedStore?.pipelineHandlers.has("testHandler")).toBe(true);

      messageStore.unregisterPipelineHandler("testHandler");

      // Get fresh state after unregistration
      updatedStore = store.getState().getMessageStore(1);
      expect(updatedStore?.pipelineHandlers.has("testHandler")).toBe(false);
    });

    it("should not throw when unregistering non-existent handler", () => {
      expect(() => {
        messageStore.unregisterPipelineHandler("nonExistent");
      }).not.toThrow();
    });
  });

  describe("processOutgoingMessage", () => {
    it("should execute all registered handlers", async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      messageStore.registerPipelineHandler("handler1", handler1);
      messageStore.registerPipelineHandler("handler2", handler2);

      const message: OutgoingMessage = {
        text: "Test message",
        to: 200,
        wantAck: true,
      };

      await messageStore.processOutgoingMessage(message);

      expect(handler1).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          deviceId: 1,
          myNodeNum: undefined,
        }),
      );
      expect(handler2).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          deviceId: 1,
          myNodeNum: undefined,
        }),
      );
    });

    it("should execute handlers in registration order", async () => {
      const executionOrder: number[] = [];

      const handler1: PipelineHandler = async () => {
        executionOrder.push(1);
      };

      const handler2: PipelineHandler = async () => {
        executionOrder.push(2);
      };

      const handler3: PipelineHandler = async () => {
        executionOrder.push(3);
      };

      messageStore.registerPipelineHandler("handler1", handler1);
      messageStore.registerPipelineHandler("handler2", handler2);
      messageStore.registerPipelineHandler("handler3", handler3);

      const message: OutgoingMessage = {
        text: "Test",
        to: 200,
        wantAck: true,
      };

      await messageStore.processOutgoingMessage(message);

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it("should continue processing if a handler fails", async () => {
      const handler1 = vi.fn().mockRejectedValue(new Error("Handler 1 failed"));
      const handler2 = vi.fn().mockResolvedValue(undefined);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      messageStore.registerPipelineHandler("handler1", handler1);
      messageStore.registerPipelineHandler("handler2", handler2);

      const message: OutgoingMessage = {
        text: "Test",
        to: 200,
        wantAck: true,
      };

      await messageStore.processOutgoingMessage(message);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should include myNodeNum in context when set", async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      // Set myNodeNum
      messageStore.setNodeNum(100);

      messageStore.registerPipelineHandler("testHandler", handler);

      const message: OutgoingMessage = {
        text: "Test",
        to: 200,
        wantAck: true,
      };

      await messageStore.processOutgoingMessage(message);

      expect(handler).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          deviceId: 1,
          myNodeNum: 100,
        }),
      );
    });

    it("should process broadcast messages", async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      messageStore.registerPipelineHandler("testHandler", handler);

      const message: OutgoingMessage = {
        text: "Broadcast message",
        to: "broadcast",
        channelId: 0,
        wantAck: true,
      };

      await messageStore.processOutgoingMessage(message);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "broadcast",
          channelId: 0,
        }),
        expect.any(Object),
      );
    });

    it("should work with no handlers registered", async () => {
      const message: OutgoingMessage = {
        text: "Test",
        to: 200,
        wantAck: true,
      };

      await expect(messageStore.processOutgoingMessage(message)).resolves.not.toThrow();
    });
  });
});
