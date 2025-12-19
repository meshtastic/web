import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard.ts";

describe("useCopyToClipboard", () => {
  const mockWriteText = vi.fn();
  const originalNavigator = { ...global.navigator };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.defineProperty(global, "navigator", {
      writable: true,
      value: {
        ...originalNavigator,
        clipboard: {
          writeText: mockWriteText.mockResolvedValue(undefined),
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(global, "navigator", {
      writable: true,
      value: originalNavigator,
    });
  });

  it("should initialize with isCopied as false", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.isCopied).toBe(false);
  });

  it("should set isCopied to true and then false after timeout on successful copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 1000 }));

    let copyResult;
    await act(async () => {
      copyResult = await result.current.copy("test text");
    });

    expect(mockWriteText).toHaveBeenCalledWith("test text");
    expect(result.current.isCopied).toBe(true);
    expect(copyResult).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isCopied).toBe(false);
  });

  it("should set isCopied to false and return false on failed copy", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("Permission denied"));
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useCopyToClipboard({ timeout: 1000 }));

    let copyResult;
    await act(async () => {
      copyResult = await result.current.copy("test text");
    });

    expect(mockWriteText).toHaveBeenCalledWith("test text");
    expect(result.current.isCopied).toBe(false);
    expect(copyResult).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should not copy if clipboard API is not available", async () => {
    Object.defineProperty(global, "navigator", {
      writable: true,
      value: {
        ...originalNavigator,
        clipboard: undefined, // Simulate no clipboard API
      },
    });
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useCopyToClipboard());

    let copyResult;
    await act(async () => {
      copyResult = await result.current.copy("test text");
    });

    expect(mockWriteText).not.toHaveBeenCalled();
    expect(result.current.isCopied).toBe(false);
    expect(copyResult).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it("should clear previous timeout if copy is called again before timeout expires", async () => {
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 1000 }));

    await act(async () => {
      await result.current.copy("text1");
    });
    expect(result.current.isCopied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isCopied).toBe(true); // Still copied

    await act(async () => {
      await result.current.copy("text2"); // Call copy again
    });
    expect(mockWriteText).toHaveBeenCalledWith("text2");
    expect(result.current.isCopied).toBe(true); // Still copied

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isCopied).toBe(true); // Should still be true (500ms into new 1000ms timeout)

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isCopied).toBe(false); // Now it should be false (1000ms after second copy)
  });
});
