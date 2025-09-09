import { DeleteMessagesDialog } from "@components/Dialog/DeleteMessagesDialog/DeleteMessagesDialog.tsx";
import { type MessageStore, useMessages } from "@core/stores";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@core/stores", () => ({
  CurrentDeviceContext: {
    _currentValue: { deviceId: 1234 },
  },
  useMessages: vi.fn(() => ({
    deleteAllMessages: vi.fn(),
  })),
}));

describe("DeleteMessagesDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockClearAllMessages = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockClearAllMessages.mockClear();

    const mockedUseMessages = vi.mocked(useMessages);
    mockedUseMessages.mockImplementation(
      () =>
        ({
          deleteAllMessages: mockClearAllMessages,
        }) as unknown as MessageStore,
    );
    mockedUseMessages.mockClear();
  });

  it("calls onOpenChange with false when the close button (X) is clicked", () => {
    render(<DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />);
    const closeButton = screen.queryByTestId("dialog-close-button");
    if (!closeButton) {
      throw new Error(
        "Dialog close button with data-testid='dialog-close-button' not found. Did you add it to the component?",
      );
    }
    fireEvent.click(closeButton);
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders the dialog when open is true", () => {
    render(<DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText("Clear All Messages")).toBeInTheDocument();
    expect(
      screen.getByText(/This action will clear all message history./),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear Messages" }),
    ).toBeInTheDocument();
  });

  it("does not render the dialog when open is false", () => {
    render(
      <DeleteMessagesDialog open={false} onOpenChange={mockOnOpenChange} />,
    );
    expect(screen.queryByText("Clear All Messages")).toBeNull();
  });

  it("calls onOpenChange with false when the dismiss button is clicked", () => {
    render(<DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1); // Add count check
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls deleteAllMessages and onOpenChange with false when the clear messages button is clicked", () => {
    render(<DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear Messages" }));
    expect(mockClearAllMessages).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1); // Add count check
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
