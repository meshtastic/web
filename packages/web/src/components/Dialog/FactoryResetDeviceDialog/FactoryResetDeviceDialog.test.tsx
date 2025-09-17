import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FactoryResetDeviceDialog } from "./FactoryResetDeviceDialog.tsx";

const mockFactoryResetDevice = vi.fn();
const mockRemoveDevice = vi.fn();
const mockRemoveMessageStore = vi.fn();
const mockRemoveNodeDB = vi.fn();
const mockToast = vi.fn();

vi.mock("@core/stores", () => {
  // Make each store a callable fn (like a Zustand hook), and attach .getState()
  const useDeviceStore = Object.assign(vi.fn(), {
    getState: () => ({ removeDevice: mockRemoveDevice }),
  });
  const useMessageStore = Object.assign(vi.fn(), {
    getState: () => ({ removeMessageStore: mockRemoveMessageStore }),
  });
  const useNodeDBStore = Object.assign(vi.fn(), {
    getState: () => ({ removeNodeDB: mockRemoveNodeDB }),
  });

  return {
    CurrentDeviceContext: {
      _currentValue: { deviceId: 1234 },
    },
    useDevice: () => ({
      id: 42,
      connection: { factoryResetDevice: mockFactoryResetDevice },
    }),
    useDeviceStore,
    useMessageStore,
    useNodeDBStore,
  };
});

vi.mock("@core/hooks/useToast.ts", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

describe("FactoryResetDeviceDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockFactoryResetDevice.mockReset();
    mockRemoveDevice.mockClear();
    mockRemoveMessageStore.mockClear();
    mockRemoveNodeDB.mockClear();
    mockToast.mockClear();
  });

  it("calls factoryResetDevice, closes dialog, and after reset resolves clears messages and node DB", async () => {
    // Control the promise returned by factoryResetDevice
    let resolveReset: (() => void) | undefined;
    mockFactoryResetDevice.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReset = resolve;
        }),
    );

    render(<FactoryResetDeviceDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Factory Reset Device" }),
    );

    // Called immediately
    expect(mockFactoryResetDevice).toHaveBeenCalledTimes(1);

    // DialogWrapper awaits onConfirm (which returns undefined), so close happens on next microtask
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    // Resolve the reset
    resolveReset?.();

    expect(mockRemoveDevice).toHaveBeenCalledTimes(1);
    expect(mockRemoveMessageStore).toHaveBeenCalledTimes(1);
    expect(mockRemoveNodeDB).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange(false) and does not call factoryResetDevice when cancel is clicked", async () => {
    render(<FactoryResetDeviceDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    expect(mockFactoryResetDevice).not.toHaveBeenCalled();
    expect(mockRemoveDevice).not.toHaveBeenCalled();
    expect(mockRemoveMessageStore).not.toHaveBeenCalled();
    expect(mockRemoveNodeDB).not.toHaveBeenCalled();
  });
});
