import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
// Ensure the path is correct for import
import { useMessageStore } from "../../../core/stores/messageStore/index.ts";
import { DeleteMessagesDialog } from "@components/Dialog/DeleteMessagesDialog/DeleteMessagesDialog.tsx";

vi.mock("@core/stores/messageStore", () => ({
  useMessageStore: vi.fn(() => ({
    deleteAllMessages: vi.fn(),
  })),
}));

describe("DeleteMessagesDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockClearAllMessages = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockClearAllMessages.mockClear();

    const mockedUseMessageStore = vi.mocked(useMessageStore);
    mockedUseMessageStore.mockImplementation(() => ({
      deleteAllMessages: mockClearAllMessages,
    }));
    mockedUseMessageStore.mockClear();
  });

  it("calls onOpenChange with false when the close button (X) is clicked", () => {
    render(
      <DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />,
    );
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
    render(
      <DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />,
    );
    expect(screen.getByText("Clear All Messages")).toBeInTheDocument();
    expect(screen.getByText(/This action will clear all message history./))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear Messages" }))
      .toBeInTheDocument();
  });

  it("does not render the dialog when open is false", () => {
    render(
      <DeleteMessagesDialog open={false} onOpenChange={mockOnOpenChange} />,
    );
    expect(screen.queryByText("Clear All Messages")).toBeNull();
  });

  it("calls onOpenChange with false when the dismiss button is clicked", () => {
    render(
      <DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1); // Add count check
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls deleteAllMessages and onOpenChange with false when the clear messages button is clicked", () => {
    render(
      <DeleteMessagesDialog open onOpenChange={mockOnOpenChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear Messages" }));
    expect(mockClearAllMessages).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1); // Add count check
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
