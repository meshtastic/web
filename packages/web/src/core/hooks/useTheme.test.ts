import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTheme } from "./useTheme";

describe("useTheme", () => {
  const originalLocalStorage = global.localStorage;
  const originalMatchMedia = global.matchMedia;
  let htmlElement: HTMLElement; // Reference to the HTML element

  let localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(global, "localStorage", {
      value: {
        getItem: vi.fn((key) => localStorageMock[key]),
        setItem: vi.fn((key, value) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
    });

    // Mock matchMedia
    Object.defineProperty(global, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes("dark") ? false : true, // Default to light system theme
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Use the actual document.documentElement from the test environment (happy-dom)
    // and spy on its setAttribute method.
    htmlElement = document.documentElement;
    vi.spyOn(htmlElement, 'setAttribute');
  });

  afterEach(() => {
    Object.defineProperty(global, "localStorage", { value: originalLocalStorage });
    Object.defineProperty(global, "matchMedia", { value: originalMatchMedia });
    vi.restoreAllMocks(); // Restore all spies
    localStorageMock = {};
  });

  it("should initialize with 'system' preference if no stored value and default to light system theme", () => {
    (global.matchMedia as vi.Mock).mockImplementation((query) => ({
        matches: query.includes("dark") ? false : true,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), // Minimal mock
    }));
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

  it("should set new preference and update localStorage", () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.setPreference("dark");
    });

    expect(localStorage.setItem).toHaveBeenCalledWith("theme", "dark");
    expect(result.current.preference).toBe("dark");
    expect(result.current.theme).toBe("dark");
  });

  it("should update theme when system preference changes if preference is 'system'", () => {
    let listeners: ((event: { matches: boolean }) => void)[] = [];
    (global.matchMedia as vi.Mock).mockImplementation((query) => ({
        matches: query.includes("dark") ? false : true, // Initial: light system
        addEventListener: vi.fn((event, callback) => {
            if (event === "change") listeners.push(callback);
        }),
        removeEventListener: vi.fn((event, callback) => {
            if (event === "change") listeners = listeners.filter(l => l !== callback);
        }),
    }));

    const { result } = renderHook(() => useTheme());
    
    expect(result.current.preference).toBe("system");
    expect(result.current.theme).toBe("light");

    // Simulate system theme change to dark
    act(() => {
        listeners.forEach(l => l({ matches: true })); // Trigger listeners for dark
    });
    expect(result.current.theme).toBe("dark");

    // Simulate system theme change back to light
    act(() => {
        listeners.forEach(l => l({ matches: false })); // Trigger listeners for light
    });
    expect(result.current.theme).toBe("light");
  });

  it("should not update theme when system preference changes if preference is not 'system'", () => {
    let listeners: ((event: { matches: boolean }) => void)[] = [];
    (global.matchMedia as vi.Mock).mockImplementation((query) => ({
        matches: query.includes("dark") ? false : true, // Initial: light system
        addEventListener: vi.fn((event, callback) => {
            if (event === "change") listeners.push(callback);
        }),
        removeEventListener: vi.fn((event, callback) => {
            if (event === "change") listeners = listeners.filter(l => l !== callback);
        }),
    }));

    const { result } = renderHook(() => useTheme());
    
    // Set preference to dark
    act(() => {
        result.current.setPreference("dark");
    });
    expect(result.current.preference).toBe("dark");
    expect(result.current.theme).toBe("dark");

    // Simulate system theme change to light - should not affect the preference
    act(() => {
        listeners.forEach(l => l({ matches: false })); // Trigger listeners for light
    });
    expect(result.current.preference).toBe("dark"); // Still dark
    expect(result.current.theme).toBe("dark"); // Still dark
  });

  it("should set data-theme attribute on document.documentElement", () => {
      const { result } = renderHook(() => useTheme());
      
      expect(htmlElement.setAttribute).toHaveBeenCalledWith("data-theme", "light"); // Initial system light
      
      act(() => {
          result.current.setPreference("dark");
      });
      expect(htmlElement.setAttribute).toHaveBeenCalledWith("data-theme", "dark");
  });
});
