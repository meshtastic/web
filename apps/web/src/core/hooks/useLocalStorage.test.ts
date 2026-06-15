import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
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
});
