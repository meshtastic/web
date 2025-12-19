import type { Message } from "@data/schema";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Create mock messages with specific IDs and dates
const createMockMessage = (
  id: number,
  date: Date,
  overrides: Partial<Message> = {},
): Message => ({
  id,
  deviceId: 1,
  messageId: id * 100,
  channelId: 0,
  toNode: 123456,
  fromNode: 789012,
  date,
  createdAt: new Date(),
  state: "ack",
  message: `Test message ${id}`,
  rxSnr: 0,
  rxRssi: 0,
  viaMqtt: false,
  hops: 0,
  type: "channel",
  retryCount: 0,
  maxRetries: 3,
  receivedACK: true,
  ackError: 0,
  ackTimestamp: null,
  ackSNR: 0,
  realACK: true,
  ...overrides,
});

// Mock markConversationAsRead to track calls
const mockMarkConversationAsRead = vi.fn();

// Mock database hooks
vi.mock("@data/hooks", () => ({
  useNodes: () => ({ nodeMap: new Map() }),
  useDirectMessages: () => ({ messages: [] }),
  useChannelMessages: () => ({
    messages: [
      // Older message (id: 1, older date)
      createMockMessage(1, new Date("2024-01-01T10:00:00")),
      // Newer message (id: 5, newer date)
      createMockMessage(5, new Date("2024-01-01T12:00:00")),
      // Middle message (id: 3, middle date)
      createMockMessage(3, new Date("2024-01-01T11:00:00")),
    ],
  }),
  markConversationAsRead: (...args: unknown[]) =>
    mockMarkConversationAsRead(...args),
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

// Mock components to simplify rendering
vi.mock("./MessageBubble", () => ({
  MessageBubble: ({ message }: { message: Message }) => (
    <div data-testid={`message-${message.id}`}>{message.message}</div>
  ),
}));

vi.mock("./MessageInput", () => ({
  MessageInput: () => <div data-testid="message-input">Input</div>,
}));

vi.mock("@shared/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@shared/components/generic/OnlineIndicator", () => ({
  OnlineIndicator: () => null,
}));

vi.mock("@components/NodeAvatar", () => ({
  NodeAvatar: () => null,
}));

// Import after mocks
import { ChatPanel } from "./ChatPanel";

describe("ChatPanel", () => {
  const mockDevice = {
    id: 1,
    getMyNodeNum: () => 999,
  };

  const mockChannelContact = {
    type: "channel" as const,
    id: 0,
    name: "Test Channel",
    nodeId: "!test",
    nodeNum: 0,
    online: true,
  };

  beforeEach(() => {
    mockMarkConversationAsRead.mockClear();
  });

  it("should mark conversation as read with the NEWEST message ID, not oldest", async () => {
    render(
      <ChatPanel
        contact={mockChannelContact}
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        device={mockDevice as any}
        showHeader={false}
      />,
    );

    await waitFor(() => {
      expect(mockMarkConversationAsRead).toHaveBeenCalled();
    });

    // Verify markConversationAsRead was called with the newest message (id: 5)
    // NOT the oldest message (id: 1)
    const [deviceId, type, conversationId, messageId] =
      mockMarkConversationAsRead.mock.calls[0];

    expect(deviceId).toBe(1);
    expect(type).toBe("channel");
    expect(conversationId).toBe("0");

    // CRITICAL: The message ID should be 5 (newest), not 1 (oldest)
    // Messages are sorted newest-first, so sortedMessages[0] should be id: 5
    expect(messageId).toBe(5);
  });

  it("should sort messages newest-first for display (flex-col-reverse shows oldest at top)", async () => {
    const { container } = render(
      <ChatPanel
        contact={mockChannelContact}
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        device={mockDevice as any}
        showHeader={false}
      />,
    );

    await waitFor(() => {
      expect(mockMarkConversationAsRead).toHaveBeenCalled();
    });

    // Get only message bubble elements (not input or other elements)
    const messageElements = container.querySelectorAll('[data-testid^="message-"]:not([data-testid="message-input"])');
    const messageIds = Array.from(messageElements).map((el) =>
      el.getAttribute("data-testid")?.replace("message-", ""),
    );

    // With flex-col-reverse and newest-first sort:
    // DOM order should be: 5 (newest), 3 (middle), 1 (oldest)
    // Visual order (due to flex-col-reverse): 1 (oldest at top), 3, 5 (newest at bottom)
    expect(messageIds).toEqual(["5", "3", "1"]);
  });
});
