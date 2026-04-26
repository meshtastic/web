import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FactoryResetDeviceDialog } from "./FactoryResetDeviceDialog.tsx";

const mockFactoryResetDevice = vi.fn();
const mockRemoveDevice = vi.fn();
const mockToast = vi.fn();

vi.mock("@core/stores", () => {
  const useDeviceStore = Object.assign(vi.fn(), {
    getState: () => ({ removeDevice: mockRemoveDevice }),
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
    mockToast.mockClear();
  });

  it("calls factoryResetDevice, closes dialog, and after reset resolves removes the device", async () => {
    let resolveReset: (() => void) | undefined;
    mockFactoryResetDevice.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReset = resolve;
        }),
    );

    render(<FactoryResetDeviceDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Factory Reset Device" }));

    expect(mockFactoryResetDevice).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    resolveReset?.();

    expect(mockRemoveDevice).toHaveBeenCalledTimes(1);
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
  });
});
