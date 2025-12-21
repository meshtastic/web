import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./useTheme.ts";

describe("useTheme", () => {
  let htmlElement: HTMLElement;
  let mediaListeners: Array<(event: { matches: boolean }) => void> = [];

  beforeEach(() => {
    localStorage.clear();
    mediaListeners = [];
    vi.clearAllMocks();

    // Override matchMedia mock for theme tests
    vi.mocked(globalThis.matchMedia).mockImplementation((query: string) => ({
      matches: query.includes("dark") ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === "change") {
          mediaListeners.push(callback);
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    htmlElement = document.documentElement;
    vi.spyOn(htmlElement, "setAttribute");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with 'system' preference and default to light system theme", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe("system");
    expect(result.current.theme).toBe("light");
  });

  it("should initialize with stored preference", () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe("dark");
    expect(result.current.theme).toBe("dark");
  });

  it("should set new preference and update localStorage", async () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setPreference("dark");
    });

    expect(localStorage.getItem("theme")).toBe("dark");

    await waitFor(() => {
      expect(result.current.preference).toBe("dark");
      expect(result.current.theme).toBe("dark");
    });
  });

  it("should not update theme when system preference changes if preference is not 'system'", async () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setPreference("dark");
    });

    await waitFor(() => {
      expect(result.current.preference).toBe("dark");
      expect(result.current.theme).toBe("dark");
    });

    // Simulate system theme change - should not affect explicit preference
    act(() => {
      for (const listener of mediaListeners) {
        listener({ matches: false });
      }
    });

    expect(result.current.preference).toBe("dark");
    expect(result.current.theme).toBe("dark");
  });

  it("should set data-theme attribute on document.documentElement", async () => {
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(htmlElement.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "light",
      );
    });

    act(() => {
      result.current.setPreference("dark");
    });

    await waitFor(() => {
      expect(htmlElement.setAttribute).toHaveBeenCalledWith(
        "data-theme",
        "dark",
      );
    });
  });
});
