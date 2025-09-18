import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FactoryResetConfigDialog } from "./FactoryResetConfigDialog.tsx";

const mockFactoryReset = vi.fn();
const mockToast = vi.fn();

vi.mock("@core/stores", () => ({
  CurrentDeviceContext: {
    _currentValue: { deviceId: 1234 },
  },
  useDevice: () => ({
    connection: {
      factoryResetConfig: mockFactoryReset,
    },
  }),
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

describe("FactoryResetConfigDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockFactoryReset.mockReset();
    mockToast.mockClear();
    mockFactoryReset.mockResolvedValue(undefined);
  });

  it("calls factoryResetConfig and then closes the dialog on confirm", async () => {
    render(<FactoryResetConfigDialog open onOpenChange={mockOnOpenChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Factory Reset Config" }),
    );

    expect(mockFactoryReset).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    // success path: no toast
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("calls onOpenChange(false) and does not call factoryResetConfig when cancel is clicked", async () => {
    render(<FactoryResetConfigDialog open onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    expect(mockFactoryReset).not.toHaveBeenCalled();
  });
});
