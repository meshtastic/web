import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useWindowFocus } from "./useWindowFocus.ts";

describe("useWindowFocus", () => {
  afterEach(() => {
    // Reset document.hidden to default (not hidden)
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
  });

  it("should initialize with true (focused)", () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });

    const { result } = renderHook(() => useWindowFocus());
    expect(result.current).toBe(true);
  });

  it("should update to false on window blur", () => {
    const { result } = renderHook(() => useWindowFocus());

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(result.current).toBe(false);
  });

  it("should update to true on window focus", () => {
    const { result } = renderHook(() => useWindowFocus());

    // Blur first
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(result.current).toBe(false);

    // Focus
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
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
