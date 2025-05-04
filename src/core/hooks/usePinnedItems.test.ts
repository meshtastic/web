import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePinnedItems } from "./usePinnedItems.ts";

const mockSetPinnedItems = vi.fn();
const mockUseLocalStorage = vi.fn();

vi.mock("@core/hooks/useLocalStorage.ts", () => ({
  default: (...args) => mockUseLocalStorage(...args),
}));

describe("usePinnedItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default pinnedItems and togglePinnedItem", () => {
    mockUseLocalStorage.mockReturnValue([[], mockSetPinnedItems]);

    const { result } = renderHook(() =>
      usePinnedItems({ storageName: "test-storage" })
    );

    expect(result.current.pinnedItems).toEqual([]);
    expect(typeof result.current.togglePinnedItem).toBe("function");
  });

  it("adds an item if it's not already pinned", () => {
    mockUseLocalStorage.mockReturnValue([["item1"], mockSetPinnedItems]);

    const { result } = renderHook(() =>
      usePinnedItems({ storageName: "test-storage" })
    );

    act(() => {
      result.current.togglePinnedItem("item2");
    });

    expect(mockSetPinnedItems).toHaveBeenCalledWith(expect.any(Function));

    const updater = mockSetPinnedItems.mock.calls[0][0];
    const updated = updater(["item1"]);

    expect(updated).toEqual(["item1", "item2"]);
  });

  it("removes an item if it's already pinned", () => {
    mockUseLocalStorage.mockReturnValue([
      ["item1", "item2"],
      mockSetPinnedItems,
    ]);

    const { result } = renderHook(() =>
      usePinnedItems({ storageName: "test-storage" })
    );

    act(() => {
      result.current.togglePinnedItem("item1");
    });

    expect(mockSetPinnedItems).toHaveBeenCalledWith(expect.any(Function));

    const updater = mockSetPinnedItems.mock.calls[0][0];
    const updated = updater(["item1", "item2"]);

    expect(updated).toEqual(["item2"]);
  });
});
