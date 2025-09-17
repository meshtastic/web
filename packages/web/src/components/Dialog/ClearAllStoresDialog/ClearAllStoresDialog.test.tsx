import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClearAllStoresDialog } from "./ClearAllStoresDialog.tsx";

const mockClearAllStores = vi.fn();

vi.mock("@core/stores", () => ({
  CurrentDeviceContext: {
    _currentValue: { deviceId: 1234 },
  },
  clearAllStores: () => mockClearAllStores(),
}));

describe("ClearAllStoresDialog", () => {
  const mockOnOpenChange = vi.fn();

  // Capture window.location.href assignment without triggering real navigation
  const originalLocation = window.location;
  let assignedHref: string | undefined;

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockClearAllStores.mockClear();
    assignedHref = undefined;

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        get href() {
          return originalLocation.href;
        },
        set href(val: string) {
          assignedHref = val;
        },
      },
    });
  });

  // restore the real location object after each test
  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("calls clearAllStores and navigates to '/' when confirm is clicked", () => {
    render(<ClearAllStoresDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Clear all local storage" }),
    );

    expect(mockClearAllStores).toHaveBeenCalledTimes(1);
    expect(assignedHref).toBe("/"); // forced reload target
    // We reload instead of toggling the dialog, so ensure we didn't call onOpenChange
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("calls onOpenChange with false when cancel is clicked", () => {
    render(<ClearAllStoresDialog open onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockClearAllStores).not.toHaveBeenCalled();
    expect(assignedHref).toBeUndefined(); // no navigation
    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
