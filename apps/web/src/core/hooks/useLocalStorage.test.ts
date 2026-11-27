import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useLocalStorage from "./useLocalStorage.ts";

describe("useLocalStorage", () => {
  const key = "test-key";

  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with initial value if localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage(key, "initial"));
    const [value] = result.current;
    expect(value).toBe("initial");
  });

  it("should read existing value from localStorage", () => {
    localStorage.setItem(key, JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage(key, "initial"));
    const [value] = result.current;
    expect(value).toBe("stored");
  });

  it("should update localStorage when setValue is called", () => {
    const { result } = renderHook(() => useLocalStorage(key, "initial"));
    const [, setValue] = result.current;

    act(() => {
      setValue("updated");
    });

    expect(localStorage.getItem(key)).toBe(JSON.stringify("updated"));
    expect(result.current[0]).toBe("updated");
  });

  it("should remove value from localStorage when removeValue is called", () => {
    const { result } = renderHook(() => useLocalStorage(key, "initial"));
    const [, setValue, removeValue] = result.current;

    act(() => {
      setValue("to-be-removed");
    });

    act(() => {
      removeValue();
    });

    expect(localStorage.getItem(key)).toBeNull();
    expect(result.current[0]).toBe("initial");
  });

  it("keeps the new value in memory when storage refuses the write", () => {
    const { result } = renderHook(() => useLocalStorage(key, "initial"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });

    expect(() =>
      act(() => {
        result.current[1]("updated");
      }),
    ).not.toThrow();

    expect(result.current[0]).toBe("updated");
    expect(localStorage.getItem(key)).toBeNull();
    expect(warn).toHaveBeenCalled();
    setItem.mockRestore();
    warn.mockRestore();
  });
});
