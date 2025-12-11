import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageInput } from "./MessageInput";
import type { Contact } from "@pages/Messages";
import type { Device } from "@core/stores/deviceStore";
import * as dbIndex from "@db/index";
import * as dbEventsModule from "@db/events";

// Mock the database modules
vi.mock("@db/index", () => ({
  messageRepo: {
    saveMessage: vi.fn(),
  },
}));

vi.mock("@db/events", () => ({
  dbEvents: {
    emit: vi.fn(),
  },
  DB_EVENTS: {
    MESSAGE_SAVED: "message:saved",
  },
}));

vi.mock("@core/utils/messagePipelineHandlers", () => ({
  autoFavoriteDMHandler: vi.fn().mockResolvedValue(undefined),
}));

// Mock state for useMessageDraft - mutable object for test control
const mockDraftState = {
  draft: "",
  setDraft: vi.fn(),
  clearDraft: vi.fn(),
};

vi.mock("@core/hooks/useMessageDraft", () => ({
  useMessageDraft: () => mockDraftState,
}));

describe("MessageInput", () => {
  let mockDevice: Device;
  let mockContact: Contact;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset draft state
    mockDraftState.draft = "";
    mockDraftState.setDraft = vi.fn((value: string) => {
      mockDraftState.draft = value;
    });
    mockDraftState.clearDraft = vi.fn().mockResolvedValue(undefined);

    mockDevice = {
      id: 1,
      getMyNodeNum: vi.fn().mockReturnValue(100),
      connection: {
        sendText: vi.fn().mockResolvedValue(12345),
      },
    } as unknown as Device;

    mockContact = {
      id: 200,
      name: "Test Contact",
      nodeId: "!c8",
      type: "direct",
      nodeNum: 200,
      lastMessage: "",
      time: "",
      unread: 0,
      online: true,
      isFavorite: false,
    };
  });

  it("should render input field and send button", () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
      />,
    );

    expect(screen.getByPlaceholderText("Message Test Contact...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should call setDraft when typing", () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
      />,
    );

    const input = screen.getByPlaceholderText("Message Test Contact...");
    fireEvent.change(input, { target: { value: "Hello" } });

    expect(mockDraftState.setDraft).toHaveBeenCalledWith("Hello");
  });

  it("should save to database and call sendText when submitting message", async () => {
    // Set up draft with a message
    mockDraftState.draft = "Hello!";

    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
      />,
    );

    const form = screen.getByPlaceholderText("Message Test Contact...").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockDevice.connection?.sendText).toHaveBeenCalledWith(
        "Hello!",
        200,
        true,
        undefined,
      );
    });

    await waitFor(() => {
      expect(dbIndex.messageRepo.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 1,
          messageId: 12345,
          type: "direct",
          fromNode: 100,
          toNode: 200,
          message: "Hello!",
          state: "sent",
        })
      );
    });

    await waitFor(() => {
      expect(dbEventsModule.dbEvents.emit).toHaveBeenCalledWith(
        dbEventsModule.DB_EVENTS.MESSAGE_SAVED
      );
    });
  });

  it("should process broadcast messages correctly", async () => {
    const channelContact: Contact = {
      id: 0,
      name: "Primary",
      nodeId: "#0",
      type: "channel",
      lastMessage: "",
      time: "",
      unread: 0,
      online: true,
      isFavorite: false,
    };

    // Set up draft with a message
    mockDraftState.draft = "Broadcast message";

    render(
      <MessageInput
        selectedContact={channelContact}
        device={mockDevice}
      />,
    );

    const form = screen.getByPlaceholderText("Message Primary...").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockDevice.connection?.sendText).toHaveBeenCalledWith(
        "Broadcast message",
        "broadcast",
        true,
        0,
      );
    });

    await waitFor(() => {
      expect(dbIndex.messageRepo.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "broadcast",
          channelId: 0,
          toNode: 0xffffffff,
          message: "Broadcast message",
        })
      );
    });
  });

  it("should not send empty messages", async () => {
    // Draft is empty by default
    mockDraftState.draft = "";

    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
      />,
    );

    const form = screen.getByPlaceholderText("Message Test Contact...").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(dbIndex.messageRepo.saveMessage).not.toHaveBeenCalled();
      expect(mockDevice.connection?.sendText).not.toHaveBeenCalled();
    });
  });

  it("should call clearDraft after sending message", async () => {
    mockDraftState.draft = "Test message";

    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
      />,
    );

    const form = screen.getByPlaceholderText("Message Test Contact...").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockDraftState.clearDraft).toHaveBeenCalled();
    });
  });

  it("should not call setDraft when message exceeds byte limit", () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
      />,
    );

    const input = screen.getByPlaceholderText("Message Test Contact...");
    const longMessage = "a".repeat(201); // Exceeds 200 byte limit

    fireEvent.change(input, { target: { value: longMessage } });

    // setDraft should not be called with a message over the limit
    expect(mockDraftState.setDraft).not.toHaveBeenCalled();
  });
});
