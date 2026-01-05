import * as dbIndex from "@data/index";
import type { Contact } from "../pages/MessagesPage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageInput } from "./MessageInput.tsx";

// Mock sendText function
const mockSendText = vi.fn().mockResolvedValue(12345);

// Mock the database modules
vi.mock("@data/index", () => ({
  messageRepo: {
    saveMessage: vi.fn(),
    updateMessageStateByMessageId: vi.fn(),
  },
}));

vi.mock("@shared/utils/messagePipelineHandlers", () => ({
  autoFavoriteDMHandler: vi.fn().mockResolvedValue(undefined),
}));

// Mock the useDeviceCommands hook
vi.mock("@shared/hooks/useDeviceCommands", () => ({
  useDeviceCommands: () => ({
    isConnected: () => true,
    sendText: mockSendText,
  }),
}));

// Mock useMessageDraft
vi.mock("@data/hooks", () => ({
  useMessageDraft: () => mockDraftState,
}));

// Mock useMyNode
vi.mock("@shared/hooks/useMyNode", () => ({
  useMyNode: () => ({ myNodeNum: 100 }),
}));

// Mock state for useMessageDraft - mutable object for test control
const mockDraftState = {
  draft: "",
  setDraft: vi.fn(),
  clearDraft: vi.fn(),
};

describe("MessageInput", () => {
  let mockContact: Contact;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendText.mockClear();
    // Reset draft state
    mockDraftState.draft = "";
    mockDraftState.setDraft = vi.fn((value: string) => {
      mockDraftState.draft = value;
    });
    mockDraftState.clearDraft = vi.fn().mockResolvedValue(undefined);

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
    render(<MessageInput selectedContact={mockContact} />);

    expect(
      screen.getByPlaceholderText("Message Test Contact..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should call setDraft when typing", () => {
    render(<MessageInput selectedContact={mockContact} />);

    const input = screen.getByPlaceholderText("Message Test Contact...");
    fireEvent.change(input, { target: { value: "Hello" } });

    expect(mockDraftState.setDraft).toHaveBeenCalledWith("Hello");
  });

  it("should save to database and call sendText when submitting message", async () => {
    // Set up draft with a message
    mockDraftState.draft = "Hello!";

    render(<MessageInput selectedContact={mockContact} />);

    const form = screen
      .getByPlaceholderText("Message Test Contact...")
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSendText).toHaveBeenCalledWith(
        "Hello!",
        200,
        true,
        undefined,
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

    render(<MessageInput selectedContact={channelContact} />);

    const form = screen
      .getByPlaceholderText("Message Primary...")
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSendText).toHaveBeenCalledWith(
        "Broadcast message",
        "broadcast",
        true,
        0,
      );
    });
  });

  it("should not send empty messages", async () => {
    // Draft is empty by default
    mockDraftState.draft = "";

    render(<MessageInput selectedContact={mockContact} />);

    const form = screen
      .getByPlaceholderText("Message Test Contact...")
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(dbIndex.messageRepo.saveMessage).not.toHaveBeenCalled();
      expect(mockSendText).not.toHaveBeenCalled();
    });
  });

  it("should call clearDraft after sending message", async () => {
    mockDraftState.draft = "Test message";

    render(<MessageInput selectedContact={mockContact} />);

    const form = screen
      .getByPlaceholderText("Message Test Contact...")
      .closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockDraftState.clearDraft).toHaveBeenCalled();
    });
  });

  it("should not call setDraft when message exceeds byte limit", () => {
    render(<MessageInput selectedContact={mockContact} />);

    const input = screen.getByPlaceholderText("Message Test Contact...");
    const longMessage = "a".repeat(201); // Exceeds 200 byte limit

    fireEvent.change(input, { target: { value: longMessage } });

    // setDraft should not be called with a message over the limit
    expect(mockDraftState.setDraft).not.toHaveBeenCalled();
  });
});
