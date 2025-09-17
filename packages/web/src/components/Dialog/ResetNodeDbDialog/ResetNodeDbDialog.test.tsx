// ResetNodeDbDialog.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetNodeDbDialog } from "./ResetNodeDbDialog.tsx";

const mockResetNodes = vi.fn();
const mockDeleteAllMessages = vi.fn();
const mockRemoveAllNodeErrors = vi.fn();
const mockRemoveAllNodes = vi.fn();

vi.mock("@core/stores", () => ({
  CurrentDeviceContext: {
    _currentValue: { deviceId: 1234 },
  },
  useDevice: () => ({
    connection: {
      resetNodes: mockResetNodes,
    },
  }),
  useMessages: () => ({
    deleteAllMessages: mockDeleteAllMessages,
  }),
  useNodeDB: () => ({
    removeAllNodeErrors: mockRemoveAllNodeErrors,
    removeAllNodes: mockRemoveAllNodes,
  }),
}));

describe("ResetNodeDbDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockResetNodes.mockClear();
    mockDeleteAllMessages.mockClear();
    mockRemoveAllNodeErrors.mockClear();
    mockRemoveAllNodes.mockClear();
  });

  it("calls resetNodes, closes dialog, and after resolve clears messages and node DB (with true flag)", async () => {
    // Control the promise returned by resetNodes
    let resolveReset: (() => void) | undefined;
    mockResetNodes.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReset = resolve;
        }),
    );

    render(<ResetNodeDbDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Reset Node Database" }),
    );

    // Called immediately
    expect(mockResetNodes).toHaveBeenCalledTimes(1);

    // DialogWrapper awaits onConfirm (which returns undefined), so close happens on next microtask
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    // Nothing else should have happened yet (the promise hasn't resolved)
    expect(mockDeleteAllMessages).not.toHaveBeenCalled();
    expect(mockRemoveAllNodeErrors).not.toHaveBeenCalled();
    expect(mockRemoveAllNodes).not.toHaveBeenCalled();

    // Resolve the reset
    resolveReset?.();

    // Now the .then() chain should fire
    await waitFor(() => {
      expect(mockDeleteAllMessages).toHaveBeenCalledTimes(1);
      expect(mockRemoveAllNodeErrors).toHaveBeenCalledTimes(1);
      expect(mockRemoveAllNodes).toHaveBeenCalledTimes(1);
      expect(mockRemoveAllNodes).toHaveBeenCalledWith(true);
    });
  });

  it("calls onOpenChange(false) and does not call resetNodes when cancel is clicked", async () => {
    render(<ResetNodeDbDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    expect(mockResetNodes).not.toHaveBeenCalled();
    expect(mockDeleteAllMessages).not.toHaveBeenCalled();
    expect(mockRemoveAllNodeErrors).not.toHaveBeenCalled();
    expect(mockRemoveAllNodes).not.toHaveBeenCalled();
  });
});
