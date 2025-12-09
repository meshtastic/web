import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageState } from "@core/stores/messageStore";
import { MessageStatusIndicator } from "./MessageStatusIndicator";
import type { Message } from "@core/stores/messageStore/types";

// Mock message for different states
const createMockMessage = (state: MessageState, overrides: Partial<Message> = {}): Message => ({
  messageId: 123,
  channel: 0,
  to: 123456,
  from: 789012,
  date: Date.now(),
  state,
  message: "Test message",
  rxSnr: 0,
  rxRssi: 0,
  viaMqtt: false,
  hops: 0,
  type: "direct" as any,
  priority: 3,
  retryCount: 0,
  maxRetries: 3,
  receivedACK: false,
  ackError: 0,
  ackTimestamp: 0,
  ackSNR: 0,
  realACK: false,
  ...overrides,
});

describe("MessageStatusIndicator", () => {
  it("should show clock icon for waiting state", () => {
    const message = createMockMessage(MessageState.Waiting);
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.getByText("Waiting to send")).toBeInTheDocument();
    // Check for clock icon by testing the SVG element
    const clockIcon = document.querySelector(".lucide-clock");
    expect(clockIcon).toBeInTheDocument();
  });

  it("should show spinner for sending state", () => {
    const message = createMockMessage(MessageState.Sending);
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.getByText("Sending...")).toBeInTheDocument();
    // Check for spinner icon by testing the SVG element
    const spinner = document.querySelector(".lucide-loader-circle");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("animate-spin");
  });

  it("should show single check for sent state", () => {
    const message = createMockMessage(MessageState.Sent);
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.getByText("Sent to radio")).toBeInTheDocument();
    // Check for check icon by testing the SVG element
    const checkIcon = document.querySelector(".lucide-check");
    expect(checkIcon).toBeInTheDocument();
  });

  it("should show double green check for acknowledged messages with real ACK", () => {
    const message = createMockMessage(MessageState.Ack, { 
      realACK: true,
      ackSNR: 5.5
    });
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("(5.5dB)")).toBeInTheDocument();
    // Check for double check icon by testing the SVG element
    const checkIcon = document.querySelector(".lucide-check-check");
    expect(checkIcon).toBeInTheDocument();
    expect(checkIcon).toHaveClass("text-green-500");
  });

  it("should show double blue check for acknowledged messages without real ACK", () => {
    const message = createMockMessage(MessageState.Ack, { 
      realACK: false,
      ackSNR: 3.2
    });
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.getByText("Acknowledged")).toBeInTheDocument();
    expect(screen.getByText("(3.2dB)")).toBeInTheDocument();
    // Check for double check icon by testing the SVG element
    const checkIcon = document.querySelector(".lucide-check-check");
    expect(checkIcon).toBeInTheDocument();
    expect(checkIcon).toHaveClass("text-blue-500");
  });

  it("should show X icon for failed state", () => {
    const message = createMockMessage(MessageState.Failed, { 
      ackError: 1,
      retryCount: 2
    });
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.getByText("Failed (1)")).toBeInTheDocument();
    expect(screen.getByText("(retry 2/3)")).toBeInTheDocument();
    // Check for X icon by testing the SVG element
    const xIcon = document.querySelector(".lucide-x");
    expect(xIcon).toBeInTheDocument();
    expect(xIcon).toHaveClass("text-red-500");
  });

  it("should show failed without error code when ackError is 0", () => {
    const message = createMockMessage(MessageState.Failed, { 
      ackError: 0
    });
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
  });

  it("should not show SNR when ackSNR is 0", () => {
    const message = createMockMessage(MessageState.Ack, { 
      ackSNR: 0
    });
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.queryByText(/\(.*dB\)/)).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const message = createMockMessage(MessageState.Sent);
    render(<MessageStatusIndicator message={message} className="custom-class" />);
    
    const container = screen.getByText("Sent to radio").parentElement;
    expect(container).toHaveClass("custom-class");
  });

  it("should not render for received messages in waiting state", () => {
    const message = createMockMessage(MessageState.Waiting, {
      from: 123456,
      to: 789012, // Different from from, indicating received message
    });
    render(<MessageStatusIndicator message={message} />);
    
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});