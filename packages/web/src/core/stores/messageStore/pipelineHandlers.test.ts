import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNodeDBStore } from "@core/stores/nodeDBStore";
import type { OutgoingMessage, PipelineContext } from "./types";
import { autoFavoriteDMHandler, loggingHandler } from "./pipelineHandlers";
import { Protobuf } from "@meshtastic/core";

vi.mock("@core/stores/nodeDBStore", () => ({
  useNodeDBStore: {
    getState: vi.fn(),
  },
}));

describe("pipelineHandlers", () => {
  describe("autoFavoriteDMHandler", () => {
    let mockNodeDB: {
      getNode: ReturnType<typeof vi.fn>;
      updateFavorite: ReturnType<typeof vi.fn>;
    };
    let context: PipelineContext;

    beforeEach(() => {
      vi.clearAllMocks();

      mockNodeDB = {
        getNode: vi.fn(),
        updateFavorite: vi.fn(),
      };

      (useNodeDBStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        getNodeDB: vi.fn().mockReturnValue(mockNodeDB),
      });

      context = {
        deviceId: 1,
        myNodeNum: 100,
      };
    });

    it("should mark DM recipient as favorite when not already favorited", async () => {
      const message: OutgoingMessage = {
        text: "Hello!",
        to: 200,
        wantAck: true,
      };

      const mockNode = {
        num: 200,
        isFavorite: false,
        user: { longName: "Test Node" },
      };

      mockNodeDB.getNode.mockReturnValue(mockNode);

      await autoFavoriteDMHandler(message, context);

      expect(mockNodeDB.getNode).toHaveBeenCalledWith(200);
      expect(mockNodeDB.updateFavorite).toHaveBeenCalledWith(200, true);
    });

    it("should not update favorite if node is already favorited", async () => {
      const message: OutgoingMessage = {
        text: "Hello!",
        to: 200,
        wantAck: true,
      };

      const mockNode = {
        num: 200,
        isFavorite: true,
        user: { longName: "Test Node" },
      };

      mockNodeDB.getNode.mockReturnValue(mockNode);

      await autoFavoriteDMHandler(message, context);

      expect(mockNodeDB.getNode).toHaveBeenCalledWith(200);
      expect(mockNodeDB.updateFavorite).not.toHaveBeenCalled();
    });

    it("should not process broadcast messages", async () => {
      const message: OutgoingMessage = {
        text: "Hello everyone!",
        to: "broadcast",
        channelId: 0,
        wantAck: true,
      };

      await autoFavoriteDMHandler(message, context);

      expect(mockNodeDB.getNode).not.toHaveBeenCalled();
      expect(mockNodeDB.updateFavorite).not.toHaveBeenCalled();
    });

    it("should not favorite self", async () => {
      const message: OutgoingMessage = {
        text: "Note to self",
        to: 100, // Same as myNodeNum
        wantAck: true,
      };

      await autoFavoriteDMHandler(message, context);

      expect(mockNodeDB.getNode).not.toHaveBeenCalled();
      expect(mockNodeDB.updateFavorite).not.toHaveBeenCalled();
    });

    it("should handle missing nodeDB gracefully", async () => {
      const message: OutgoingMessage = {
        text: "Hello!",
        to: 200,
        wantAck: true,
      };

      (useNodeDBStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        getNodeDB: vi.fn().mockReturnValue(undefined),
      });

      await expect(autoFavoriteDMHandler(message, context)).resolves.not.toThrow();
      expect(mockNodeDB.updateFavorite).not.toHaveBeenCalled();
    });

    it("should handle node not found gracefully", async () => {
      const message: OutgoingMessage = {
        text: "Hello!",
        to: 200,
        wantAck: true,
      };

      mockNodeDB.getNode.mockReturnValue(undefined);

      await expect(autoFavoriteDMHandler(message, context)).resolves.not.toThrow();
      expect(mockNodeDB.updateFavorite).not.toHaveBeenCalled();
    });
  });

  describe("loggingHandler", () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("should log direct messages", async () => {
      const message: OutgoingMessage = {
        text: "Hello!",
        to: 200,
        wantAck: true,
      };

      const context: PipelineContext = {
        deviceId: 1,
        myNodeNum: 100,
      };

      await loggingHandler(message, context);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[loggingHandler] Outgoing message:",
        expect.objectContaining({
          type: "Direct",
          to: 200,
          textLength: 6,
          deviceId: 1,
          myNodeNum: 100,
        }),
      );
    });

    it("should log broadcast messages", async () => {
      const message: OutgoingMessage = {
        text: "Hello everyone!",
        to: "broadcast",
        channelId: 0,
        wantAck: true,
      };

      const context: PipelineContext = {
        deviceId: 1,
        myNodeNum: 100,
      };

      await loggingHandler(message, context);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[loggingHandler] Outgoing message:",
        expect.objectContaining({
          type: "Broadcast",
          to: "broadcast",
          channelId: 0,
          textLength: 15,
        }),
      );
    });
  });
});
