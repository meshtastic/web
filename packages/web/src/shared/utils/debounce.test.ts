import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce.ts";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delays executing the callback until after wait time has elapsed", () => {
    const mockCallback = vi.fn();
    const debouncedFunction = debounce(mockCallback, 500);

    debouncedFunction();
    expect(mockCallback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(mockCallback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("only executes the callback once if called multiple times within wait period", () => {
    const mockCallback = vi.fn();
    const debouncedFunction = debounce(mockCallback, 500);

    debouncedFunction();
    debouncedFunction();
    debouncedFunction();

    vi.advanceTimersByTime(500);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("resets the timer when called again during wait period", () => {
    const mockCallback = vi.fn();
    const debouncedFunction = debounce(mockCallback, 500);

    debouncedFunction();

    vi.advanceTimersByTime(300);
    debouncedFunction();

    vi.advanceTimersByTime(300);
    expect(mockCallback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("passes arguments to the callback function", () => {
    const mockCallback = vi.fn();
    const debouncedFunction = debounce(mockCallback, 500);

    debouncedFunction("test", 123);

    vi.advanceTimersByTime(500);
    expect(mockCallback).toHaveBeenCalledWith("test", 123);
  });
});
