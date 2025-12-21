import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useLocalStorage from "./useLocalStorage.ts";

describe("useLocalStorage", () => {
  const key = "test-key";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should initialize with initial value if localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage(key, "initial"));
    expect(result.current[0]).toBe("initial");
  });

  it("should read existing value from localStorage", () => {
    localStorage.setItem(key, JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage(key, "initial"));
    expect(result.current[0]).toBe("stored");
  });

  it("should update localStorage when setValue is called", async () => {
    const { result } = renderHook(() => useLocalStorage(key, "initial"));

    act(() => {
      result.current[1]("updated");
    });

    // Check localStorage was updated
    expect(localStorage.getItem(key)).toBe(JSON.stringify("updated"));

    // Wait for the state to update via the event subscription
    await waitFor(() => {
      expect(result.current[0]).toBe("updated");
    });
  });

  it("should remove value from localStorage when removeValue is called", async () => {
    const { result } = renderHook(() => useLocalStorage(key, "initial"));

    act(() => {
      result.current[1]("to-be-removed");
    });

    await waitFor(() => {
      expect(result.current[0]).toBe("to-be-removed");
    });

    act(() => {
      result.current[2]();
    });

    expect(localStorage.getItem(key)).toBeNull();

    await waitFor(() => {
      expect(result.current[0]).toBe("initial");
    });
  });

  it("should sync across multiple hook instances", async () => {
    const { result: result1 } = renderHook(() => useLocalStorage(key, "initial"));
    const { result: result2 } = renderHook(() => useLocalStorage(key, "initial"));

    act(() => {
      result1.current[1]("synced");
    });

    await waitFor(() => {
      expect(result1.current[0]).toBe("synced");
      expect(result2.current[0]).toBe("synced");
    });
  });
});
