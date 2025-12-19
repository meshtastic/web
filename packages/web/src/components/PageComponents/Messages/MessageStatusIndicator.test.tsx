import type { Message } from "@db/schema";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageStatusIndicator } from "./MessageStatusIndicator.tsx";

// Mock message for different states
const createMockMessage = (
  state: Message["state"],
  overrides: Partial<Message> = {},
): Message => ({
  id: 1,
  messageId: 123,
  channelId: 0,
  toNode: 123456,
  fromNode: 789012,
  date: new Date(),
  createdAt: new Date(),
  state,
  message: "Test message",
  rxSnr: 0,
  rxRssi: 0,
  viaMqtt: false,
  hops: 0,
  type: "direct",
  retryCount: 0,
  maxRetries: 3,
  receivedACK: false,
  ackError: 0,
  ackTimestamp: null,
  ackSNR: 0,
  realACK: false,
  deviceId: 1,
  ...overrides,
});

describe("MessageStatusIndicator", () => {
  it("should show clock icon for waiting state", () => {
    const message = createMockMessage("waiting");
    render(<MessageStatusIndicator message={message} />);

    // Check for clock icon by testing the SVG element
    const clockIcon = document.querySelector(".lucide-clock");
    expect(clockIcon).toBeInTheDocument();
  });

  it("should show spinner for sending state", () => {
    const message = createMockMessage("sending");
    render(<MessageStatusIndicator message={message} />);

    // Check for spinner icon (Loader2) by testing for animate-spin class
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should show single check for sent state", () => {
    const message = createMockMessage("sent");
    render(<MessageStatusIndicator message={message} />);

    // Check for check icon by testing the SVG element
    const checkIcon = document.querySelector(".lucide-check");
    expect(checkIcon).toBeInTheDocument();
  });

  it("should show cloud with check for acknowledged messages with real ACK", () => {
    const message = createMockMessage("ack", {
      realACK: true,
      ackSNR: 5.5,
    });
    render(<MessageStatusIndicator message={message} />);

    expect(screen.getByText("(5.5dB)")).toBeInTheDocument();
    // Check for cloud icon (used for ack state)
    const cloudIcon = document.querySelector(".lucide-cloud");
    expect(cloudIcon).toBeInTheDocument();
    expect(cloudIcon).toHaveClass("text-green-500");
  });

  it("should show cloud with check for acknowledged messages without real ACK", () => {
    const message = createMockMessage("ack", {
      realACK: false,
      ackSNR: 3.2,
    });
    render(<MessageStatusIndicator message={message} />);

    expect(screen.getByText("(3.2dB)")).toBeInTheDocument();
    // Check for cloud icon (used for ack state)
    const cloudIcon = document.querySelector(".lucide-cloud");
    expect(cloudIcon).toBeInTheDocument();
    expect(cloudIcon).toHaveClass("text-blue-500");
  });

  it("should show X icon for failed state", () => {
    const message = createMockMessage("failed", {
      ackError: 1,
      retryCount: 2,
    });
    render(<MessageStatusIndicator message={message} />);

    expect(screen.getByText("(retry 2/3)")).toBeInTheDocument();
    // Check for X icon by testing the SVG element
    const xIcon = document.querySelector(".lucide-x");
    expect(xIcon).toBeInTheDocument();
    expect(xIcon).toHaveClass("text-red-500");
  });

  it("should show failed without retry info when retryCount is 0", () => {
    const message = createMockMessage("failed", {
      ackError: 0,
      retryCount: 0,
    });
    render(<MessageStatusIndicator message={message} />);

    // X icon should be present
    const xIcon = document.querySelector(".lucide-x");
    expect(xIcon).toBeInTheDocument();
    // No retry info should be shown
    expect(screen.queryByText(/retry/)).not.toBeInTheDocument();
  });

  it("should not show SNR when ackSNR is 0", () => {
    const message = createMockMessage("ack", {
      ackSNR: 0,
    });
    render(<MessageStatusIndicator message={message} />);

    expect(screen.queryByText(/\(.*dB\)/)).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const message = createMockMessage("sent");
    const { container } = render(
      <MessageStatusIndicator message={message} className="custom-class" />,
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("should render for messages in waiting state", () => {
    const message = createMockMessage("waiting", {
      fromNode: 123456,
      toNode: 789012,
    });
    render(<MessageStatusIndicator message={message} />);

    // Clock icon should be present for waiting state
    const clockIcon = document.querySelector(".lucide-clock");
    expect(clockIcon).toBeInTheDocument();
  });
});
