import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePasswordVisibilityToggle } from "./usePasswordVisibilityToggle.ts";

describe("usePasswordVisibilityToggle Hook", () => {
  it("should initialize with visibility set to false by default", () => {
    const { result } = renderHook(() => usePasswordVisibilityToggle());
    expect(result.current.isVisible).toBe(false);
    expect(typeof result.current.toggleVisibility).toBe("function");
  });

  it("should initialize with visibility set to true if initialVisible is true", () => {
    const { result } = renderHook(() =>
      usePasswordVisibilityToggle({ initialVisible: true }),
    );
    expect(result.current.isVisible).toBe(true);
  });

  it("should toggle visibility from false to true when toggleVisibility is called", () => {
    const { result } = renderHook(() => usePasswordVisibilityToggle());
    expect(result.current.isVisible).toBe(false);
    act(() => {
      result.current.toggleVisibility();
    });
    expect(result.current.isVisible).toBe(true);
  });

  it("should toggle visibility from true to false when toggleVisibility is called", () => {
    const { result } = renderHook(() =>
      usePasswordVisibilityToggle({ initialVisible: true }),
    );
    expect(result.current.isVisible).toBe(true);
    act(() => {
      result.current.toggleVisibility();
    });
    expect(result.current.isVisible).toBe(false);
  });

  it("should toggle visibility correctly multiple times", () => {
    const { result } = renderHook(() => usePasswordVisibilityToggle());
    expect(result.current.isVisible).toBe(false);
    act(() => {
      result.current.toggleVisibility();
    });
    expect(result.current.isVisible).toBe(true);
    act(() => {
      result.current.toggleVisibility();
    });
    expect(result.current.isVisible).toBe(false);
    act(() => {
      result.current.toggleVisibility();
    });
    expect(result.current.isVisible).toBe(true);
  });

  it("should return a stable toggleVisibility function reference (due to useCallback)", () => {
    const { result, rerender } = renderHook(() =>
      usePasswordVisibilityToggle(),
    );
    const initialToggleFunc = result.current.toggleVisibility;
    rerender();
    expect(result.current.toggleVisibility).toBe(initialToggleFunc);
    act(() => {
      result.current.toggleVisibility();
    });
    expect(result.current.isVisible).toBe(true);
  });
});
