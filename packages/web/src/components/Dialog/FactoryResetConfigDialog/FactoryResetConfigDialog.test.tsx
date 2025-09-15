import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FactoryResetConfigDialog } from "./FactoryResetConfigDialog.tsx";

const mockFactoryReset = vi.fn();

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

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      switch (key) {
        case "factoryResetConfig.title":
          return "Factory Reset Config";
        case "factoryResetConfig.description":
          return "This will reset device configuration to factory defaults.";
        case "factoryResetConfig.confirm":
          return "Factory Reset";
        default:
          return key;
      }
    },
  }),
}));

describe("FactoryResetConfigDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockFactoryReset.mockClear();
  });

  it("calls factoryResetConfig and onOpenChange(false) when confirm is clicked", async () => {
    render(<FactoryResetConfigDialog open onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Factory Reset" }));

    expect(mockFactoryReset).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("calls onOpenChange(false) and does not call factoryResetConfig when cancel is clicked", () => {
    render(<FactoryResetConfigDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "button.cancel" }));

    expect(mockFactoryReset).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
