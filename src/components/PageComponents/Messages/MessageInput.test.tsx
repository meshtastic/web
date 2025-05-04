import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageInput, MessageInputProps } from "./MessageInput.tsx";
import { Types } from "@meshtastic/core";

vi.mock("@components/UI/Button.tsx", () => ({
  Button: vi.fn((
    { type, className, children, onClick, onSubmit, ...rest },
  ) => (
    <button
      type={type}
      className={className}
      onClick={onClick}
      onSubmit={onSubmit}
      {...rest}
    >
      {children}
    </button>
  )),
}));

vi.mock("@components/UI/Input.tsx", () => ({
  Input: vi.fn((
    { autoFocus, minLength, name, placeholder, value, onChange },
  ) => (
    <input
      autoFocus={autoFocus}
      minLength={minLength}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid="message-input-field"
    />
  )),
}));

const mockSetDraft = vi.fn();
const mockGetDraft = vi.fn();
const mockClearDraft = vi.fn();

vi.mock("@core/stores/messageStore", () => ({
  useMessageStore: vi.fn(() => ({
    setDraft: mockSetDraft,
    getDraft: mockGetDraft,
    clearDraft: mockClearDraft,
  })),
  MessageState: {
    Ack: "ack",
    Waiting: "waiting",
    Failed: "failed",
  },
  MessageType: {
    Direct: "direct",
    Broadcast: "broadcast",
  },
}));

vi.mock("lucide-react", () => ({
  SendIcon: vi.fn(() => <svg data-testid="send-icon" />),
}));

describe("MessageInput", () => {
  const mockOnSend = vi.fn();
  const defaultProps: MessageInputProps = {
    onSend: mockOnSend,
    to: 123,
    maxBytes: 256,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetDraft.mockReturnValue("");
  });

  const renderComponent = (props: Partial<MessageInputProps> = {}) => {
    render(<MessageInput {...defaultProps} {...props} />);
  };

  it("should render the input field, byte counter, and send button", () => {
    renderComponent();
    expect(screen.getByPlaceholderText("Enter Message")).toBeInTheDocument();
    expect(screen.getByTestId("byte-counter")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByTestId("send-icon")).toBeInTheDocument();
  });

  it("should initialize with the draft from the store", () => {
    const initialDraft = "Existing draft message";
    mockGetDraft.mockImplementation((key) => {
      return key === defaultProps.to ? initialDraft : "";
    });

    renderComponent();

    const inputElement = screen.getByPlaceholderText(
      "Enter Message",
    ) as HTMLInputElement;
    expect(inputElement.value).toBe(initialDraft);
    expect(mockGetDraft).toHaveBeenCalledWith(defaultProps.to);
    const expectedBytes = new Blob([initialDraft]).size;
    expect(screen.getByTestId("byte-counter")).toHaveTextContent(
      `${expectedBytes}/${defaultProps.maxBytes}`,
    );
  });

  it("should update input value, byte counter, and call setDraft on change within limits", () => {
    renderComponent();
    const inputElement = screen.getByPlaceholderText("Enter Message");
    const testMessage = "Hello there!";
    const expectedBytes = new Blob([testMessage]).size;

    fireEvent.change(inputElement, { target: { value: testMessage } });

    expect((inputElement as HTMLInputElement).value).toBe(testMessage);
    expect(screen.getByTestId("byte-counter")).toHaveTextContent(
      `${expectedBytes}/${defaultProps.maxBytes}`,
    );
    expect(mockSetDraft).toHaveBeenCalledTimes(1);
    expect(mockSetDraft).toHaveBeenCalledWith(defaultProps.to, testMessage);
  });

  it("should NOT update input value or call setDraft if maxBytes is exceeded", () => {
    const smallMaxBytes = 5;
    renderComponent({ maxBytes: smallMaxBytes });
    const inputElement = screen.getByPlaceholderText("Enter Message");
    const initialValue = "12345";
    const excessiveValue = "123456";

    fireEvent.change(inputElement, { target: { value: initialValue } });
    expect((inputElement as HTMLInputElement).value).toBe(initialValue);
    expect(mockSetDraft).toHaveBeenCalledWith(defaultProps.to, initialValue);
    mockSetDraft.mockClear();

    fireEvent.change(inputElement, { target: { value: excessiveValue } });

    expect((inputElement as HTMLInputElement).value).toBe(initialValue);
    expect(screen.getByTestId("byte-counter")).toHaveTextContent(
      `${smallMaxBytes}/${smallMaxBytes}`,
    );
    expect(mockSetDraft).not.toHaveBeenCalled();
  });

  it("should call onSend, clear input, reset byte counter, and call clearDraft on valid submit", async () => {
    renderComponent();
    const inputElement = screen.getByPlaceholderText("Enter Message");
    const formElement = screen.getByRole("form");
    const testMessage = "Send this message";

    fireEvent.change(inputElement, { target: { value: testMessage } });
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockOnSend).toHaveBeenCalledWith(testMessage);
      expect((inputElement as HTMLInputElement).value).toBe("");
      expect(screen.getByTestId("byte-counter")).toHaveTextContent(
        `0/${defaultProps.maxBytes}`,
      );
      expect(mockClearDraft).toHaveBeenCalledTimes(1);
      expect(mockClearDraft).toHaveBeenCalledWith(defaultProps.to);
    });
  });

  it("should trim whitespace before calling onSend", async () => {
    renderComponent();
    const inputElement = screen.getByPlaceholderText("Enter Message");
    const formElement = screen.getByRole("form");
    const testMessageWithWhitespace = "  Trim me!  ";
    const expectedTrimmedMessage = "Trim me!";

    fireEvent.change(inputElement, {
      target: { value: testMessageWithWhitespace },
    });
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockOnSend).toHaveBeenCalledWith(expectedTrimmedMessage);
      expect(mockClearDraft).toHaveBeenCalledWith(defaultProps.to);
    });
  });

  it("should not call onSend or clearDraft if input is empty on submit", async () => {
    renderComponent();
    const inputElement = screen.getByPlaceholderText("Enter Message");
    const formElement = screen.getByRole("form");

    expect((inputElement as HTMLInputElement).value).toBe("");

    fireEvent.submit(formElement);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockOnSend).not.toHaveBeenCalled();
    expect(mockClearDraft).not.toHaveBeenCalled();
  });

  it("should not call onSend or clearDraft if input contains only whitespace on submit", async () => {
    renderComponent();
    const inputElement = screen.getByTestId("message-input-field");
    const formElement = screen.getByRole("form");
    const whitespaceMessage = "   \t   ";

    fireEvent.change(inputElement, { target: { value: whitespaceMessage } });
    expect((inputElement as HTMLInputElement).value).toBe(whitespaceMessage);

    fireEvent.submit(formElement);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockOnSend).not.toHaveBeenCalled();
    expect(mockClearDraft).not.toHaveBeenCalled();

    expect((inputElement as HTMLInputElement).value).toBe(whitespaceMessage);
  });

  it("should work with broadcast destination for drafts", () => {
    const broadcastDest: Types.Destination = "broadcast";
    mockGetDraft.mockImplementation((key) =>
      key === broadcastDest ? "Broadcast draft" : ""
    );

    renderComponent({ to: broadcastDest });

    expect(mockGetDraft).toHaveBeenCalledWith(broadcastDest);
    expect(
      (screen.getByPlaceholderText("Enter Message") as HTMLInputElement).value,
    ).toBe("Broadcast draft");

    const inputElement = screen.getByPlaceholderText("Enter Message");
    const formElement = screen.getByRole("form");
    const newMessage = "New broadcast msg";

    fireEvent.change(inputElement, { target: { value: newMessage } });
    expect(mockSetDraft).toHaveBeenCalledWith(broadcastDest, newMessage);

    fireEvent.submit(formElement);

    expect(mockOnSend).toHaveBeenCalledWith(newMessage);
    expect(mockClearDraft).toHaveBeenCalledWith(broadcastDest);
  });
});
