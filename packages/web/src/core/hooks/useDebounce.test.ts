import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("should update the value after the delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    expect(result.current).toBe("initial");

    // Change value
    rerender({ value: "updated", delay: 500 });
    
    // Should still be initial immediately
    expect(result.current).toBe("initial");

    // Fast forward
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });

  it("should reset timer if value changes before delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    rerender({ value: "update1", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    
    // Change again before timeout
    rerender({ value: "update2", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Should not have updated to update1 (total 500ms passed since first update, but timer reset)
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Now it should be update2 (500ms after second update)
    expect(result.current).toBe("update2");
  });
});
