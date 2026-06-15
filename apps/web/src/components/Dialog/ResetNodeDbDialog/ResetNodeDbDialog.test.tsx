import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetNodeDbDialog } from "./ResetNodeDbDialog.tsx";

const mockResetNodes = vi.fn();
const mockClearAll = vi.fn();

const { mockUseActiveClient } = vi.hoisted(() => ({
  mockUseActiveClient: vi.fn(),
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useActiveClient: mockUseActiveClient,
}));

describe("ResetNodeDbDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActiveClient.mockReturnValue({
      nodes: { reset: mockResetNodes },
      chat: { clearAll: mockClearAll },
    });
  });

  it("calls reset({ keepMyNode: true }) then clears chat after resolve", async () => {
    let resolveReset: ((value: { status: "ok"; value: number }) => void) | undefined;
    mockResetNodes.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReset = resolve;
        }),
    );
    mockClearAll.mockResolvedValue(undefined);

    render(<ResetNodeDbDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset Node Database" }));

    expect(mockResetNodes).toHaveBeenCalledWith({ keepMyNode: true });

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    expect(mockClearAll).not.toHaveBeenCalled();

    resolveReset?.({ status: "ok", value: 1 });

    await waitFor(() => {
      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });
  });

  it("does not call reset when cancel is clicked", async () => {
    render(<ResetNodeDbDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    expect(mockResetNodes).not.toHaveBeenCalled();
    expect(mockClearAll).not.toHaveBeenCalled();
  });
});
