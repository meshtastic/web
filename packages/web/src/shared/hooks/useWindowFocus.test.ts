import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWindowFocus } from "./useWindowFocus.ts";

describe("useWindowFocus", () => {
  it("should initialize with true (focused)", () => {
    // Mock document.hidden to be false initially
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });

    const { result } = renderHook(() => useWindowFocus());
    expect(result.current).toBe(true);
  });

  it("should update to false on window blur", () => {
    const { result } = renderHook(() => useWindowFocus());

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(result.current).toBe(false);
  });

  it("should update to true on window focus", () => {
    const { result } = renderHook(() => useWindowFocus());

    // Blur first
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(result.current).toBe(false);

    // Focus
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toBe(true);
  });

  it("should update on visibilitychange", () => {
    const { result } = renderHook(() => useWindowFocus());

    // Simulate tab hiding
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(false);

    // Simulate tab showing
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(true);
  });
});
