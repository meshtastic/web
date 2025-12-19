import { act, renderHook } from "@testing-library/react";
import { useState } from "react"; // Import useState and useEffect from react
import { beforeEach, describe, expect, it, vi } from "vitest";
import useLocalStorage from "@shared/hooks/useLocalStorage";
import { usePinnedItems } from "./usePinnedItems.ts";

// Mock useLocalStorage
vi.mock("@shared/hooks/useLocalStorage", () => ({
  default: vi.fn(),
}));

describe("usePinnedItems", () => {
  const STORAGE_KEY = "pinned-test";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useLocalStorage to return a useState instance, simulating its behavior
    // This allows `renderHook` to manage the state returned by useLocalStorage correctly.
    (useLocalStorage as vi.Mock).mockImplementation((_key, initialValue) => {
      // Use actual React hooks within the mock implementation to behave like a real hook
      const [state, setState] = useState(initialValue);
      return [state, setState];
    });
  });

  it("should initialize with empty pinned items if none in storage", () => {
    // Ensure useLocalStorage mock's useState initializes with an empty array
    (useLocalStorage as vi.Mock).mockImplementationOnce(() => {
      const [state, setState] = useState([]);
      return [state, setState];
    });

    const { result } = renderHook(() =>
      usePinnedItems({ storageName: STORAGE_KEY }),
    );
    expect(result.current.pinnedItems).toEqual([]);
  });

  it("should initialize with items from storage", () => {
    // Ensure useLocalStorage mock's useState initializes with predefined items
    (useLocalStorage as vi.Mock).mockImplementationOnce(() => {
      const [state, setState] = useState(["item1", "item2"]);
      return [state, setState];
    });

    const { result } = renderHook(() =>
      usePinnedItems({ storageName: STORAGE_KEY }),
    );
    expect(result.current.pinnedItems).toEqual(["item1", "item2"]);
  });

  it("should add an item if not already pinned", () => {
    const { result } = renderHook(() =>
      usePinnedItems({ storageName: STORAGE_KEY }),
    );

    act(() => {
      result.current.togglePinnedItem("itemA");
    });

    expect(result.current.pinnedItems).toEqual(["itemA"]);
  });

  it("should remove an item if already pinned", () => {
    // Initialize the useLocalStorage mock with items
    (useLocalStorage as vi.Mock).mockImplementationOnce(() => {
      const [state, setState] = useState(["itemA", "itemB"]);
      return [state, setState];
    });

    const { result } = renderHook(() =>
      usePinnedItems({ storageName: STORAGE_KEY }),
    );

    act(() => {
      result.current.togglePinnedItem("itemA");
    });

    expect(result.current.pinnedItems).toEqual(["itemB"]);
  });

  it("should handle multiple toggles correctly", () => {
    const { result } = renderHook(() =>
      usePinnedItems({ storageName: STORAGE_KEY }),
    );

    act(() => {
      result.current.togglePinnedItem("itemX");
    });
    expect(result.current.pinnedItems).toEqual(["itemX"]);

    act(() => {
      result.current.togglePinnedItem("itemY");
    });
    expect(result.current.pinnedItems).toEqual(["itemX", "itemY"]);

    act(() => {
      result.current.togglePinnedItem("itemX");
    });
    expect(result.current.pinnedItems).toEqual(["itemY"]);
  });
});
