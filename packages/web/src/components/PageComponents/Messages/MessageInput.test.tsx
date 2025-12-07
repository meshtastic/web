import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageInput } from "./MessageInput";
import type { Contact } from "@pages/Messages";
import type { Device } from "@core/stores/deviceStore";
import type { MessageStore } from "@core/stores/messageStore";

describe("MessageInput", () => {
  let mockDevice: Device;
  let mockMessages: MessageStore;
  let mockContact: Contact;

  beforeEach(() => {
    mockDevice = {
      id: 1,
      myNodeNum: 100,
      connection: {
        sendText: vi.fn().mockResolvedValue(12345),
      },
    } as unknown as Device;

    mockMessages = {
      processOutgoingMessage: vi.fn().mockResolvedValue(undefined),
      setMessageState: vi.fn(),
    } as unknown as MessageStore;

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
    };
  });

  it("should render input field and send button", () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
        messages={mockMessages}
      />,
    );

    expect(screen.getByPlaceholderText("Message Test Contact...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should update byte counter when typing", () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
        messages={mockMessages}
      />,
    );

    const input = screen.getByPlaceholderText("Message Test Contact...");
    fireEvent.change(input, { target: { value: "Hello" } });

    expect(screen.getByText(/5\/200/)).toBeInTheDocument();
  });

  it("should call pipeline and sendText when submitting message", async () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
        messages={mockMessages}
      />,
    );

    const input = screen.getByPlaceholderText("Message Test Contact...");
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "Hello!" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMessages.processOutgoingMessage).toHaveBeenCalledWith({
        text: "Hello!",
        to: 200,
        channelId: undefined,
        wantAck: true,
      });
    });

    await waitFor(() => {
      expect(mockDevice.connection?.sendText).toHaveBeenCalledWith(
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
    };

    render(
      <MessageInput
        selectedContact={channelContact}
        device={mockDevice}
        messages={mockMessages}
      />,
    );

    const input = screen.getByPlaceholderText("Message Primary...");
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "Broadcast message" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMessages.processOutgoingMessage).toHaveBeenCalledWith({
        text: "Broadcast message",
        to: "broadcast",
        channelId: 0,
        wantAck: true,
      });
    });
  });

  it("should not send empty messages", async () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
        messages={mockMessages}
      />,
    );

    const form = screen.getByPlaceholderText("Message Test Contact...").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMessages.processOutgoingMessage).not.toHaveBeenCalled();
      expect(mockDevice.connection?.sendText).not.toHaveBeenCalled();
    });
  });

  it("should clear input after sending message", async () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
        messages={mockMessages}
      />,
    );

    const input = screen.getByPlaceholderText("Message Test Contact...") as HTMLInputElement;
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "Test message" } });
    expect(input.value).toBe("Test message");

    fireEvent.submit(form);

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("should enforce max byte limit", () => {
    render(
      <MessageInput
        selectedContact={mockContact}
        device={mockDevice}
        messages={mockMessages}
      />,
    );

    const input = screen.getByPlaceholderText("Message Test Contact...") as HTMLInputElement;
    const longMessage = "a".repeat(201); // Exceeds 200 byte limit

    fireEvent.change(input, { target: { value: longMessage } });

    // Should not accept the message
    expect(input.value).toBe("");
  });
});
