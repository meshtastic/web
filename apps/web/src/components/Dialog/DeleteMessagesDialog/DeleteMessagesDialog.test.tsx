import { DeleteMessagesDialog } from "@components/Dialog/DeleteMessagesDialog/DeleteMessagesDialog.tsx";
import { useActiveClient } from "@meshtastic/sdk-react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClearAll = vi.fn();

vi.mock("@meshtastic/sdk-react", () => ({
  useActiveClient: vi.fn(() => ({
    chat: { clearAll: mockClearAll },
  })),
}));

describe("DeleteMessagesDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockClearAll.mockClear();
    vi.mocked(useActiveClient).mockReturnValue({
      chat: { clearAll: mockClearAll },
    } as never);
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
    expect(screen.getByText(/This action will clear all message history./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear Messages" })).toBeInTheDocument();
  });

  it("does not render the dialog when open is false", () => {
    render(<DeleteMessagesDialog open={false} onOpenChange={mockOnOpenChange} />);
    expect(screen.queryByText("Clear All Messages")).toBeNull();
  });

  it("calls onOpenChange with false when the dismiss button is clicked", () => {
    render(<DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls chat.clearAll and onOpenChange with false when Clear Messages is clicked", () => {
    render(<DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear Messages" }));
    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("no-ops gracefully when there is no active client", () => {
    vi.mocked(useActiveClient).mockReturnValue(undefined);
    render(<DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear Messages" }));
    expect(mockClearAll).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
