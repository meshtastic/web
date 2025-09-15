// FactoryResetDeviceDialog.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FactoryResetDeviceDialog } from "./FactoryResetDeviceDialog.tsx";

const mockFactoryResetDevice = vi.fn();
const mockDeleteAllMessages = vi.fn();
const mockRemoveAllNodeErrors = vi.fn();
const mockRemoveAllNodes = vi.fn();

vi.mock("@core/stores", () => ({
  CurrentDeviceContext: {
    _currentValue: { deviceId: 1234 },
  },
  useDevice: () => ({
    connection: {
      factoryResetDevice: mockFactoryResetDevice,
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

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      switch (key) {
        case "factoryResetDevice.title":
          return "Factory Reset Device";
        case "factoryResetDevice.description":
          return "This will reset the device and clear local data.";
        case "factoryResetDevice.confirm":
          return "Reset Device";
        default:
          return key;
      }
    },
  }),
}));

describe("FactoryResetDeviceDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockFactoryResetDevice.mockClear();
    mockDeleteAllMessages.mockClear();
    mockRemoveAllNodeErrors.mockClear();
    mockRemoveAllNodes.mockClear();
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
    fireEvent.click(screen.getByRole("button", { name: "Reset Device" }));

    // Called immediately
    expect(mockFactoryResetDevice).toHaveBeenCalledTimes(1);

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
    });
  });

  it("calls onOpenChange(false) and does not call factoryResetDevice when cancel is clicked", async () => {
    render(<FactoryResetDeviceDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "button.cancel" }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    expect(mockFactoryResetDevice).not.toHaveBeenCalled();
    expect(mockDeleteAllMessages).not.toHaveBeenCalled();
    expect(mockRemoveAllNodeErrors).not.toHaveBeenCalled();
    expect(mockRemoveAllNodes).not.toHaveBeenCalled();
  });
});
