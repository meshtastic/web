import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import useCookie from "./useCookie"; // Note: It's a default export
import Cookies from "js-cookie";

vi.mock("js-cookie", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe("useCookie", () => {
  const COOKIE_NAME = "test-cookie";
  const INITIAL_VALUE = { theme: "light" };
  const NEW_VALUE = { theme: "dark" };

  beforeEach(() => {
    vi.clearAllMocks();
    (Cookies.get as vi.Mock).mockReturnValue(undefined); // Default to no cookie
  });

  it("should return undefined if cookie does not exist and no initial value is provided", () => {
    const { result } = renderHook(() => useCookie(COOKIE_NAME));
    expect(result.current.value).toBeUndefined();
  });

  it("should return the initial value if cookie does not exist", () => {
    const { result } = renderHook(() => useCookie(COOKIE_NAME, INITIAL_VALUE));
    expect(result.current.value).toEqual(INITIAL_VALUE);
  });

  it("should return the parsed cookie value if it exists", () => {
    (Cookies.get as vi.Mock).mockReturnValue(JSON.stringify(NEW_VALUE));
    const { result } = renderHook(() => useCookie(COOKIE_NAME, INITIAL_VALUE));
    expect(result.current.value).toEqual(NEW_VALUE);
  });

  it("should set a cookie", () => {
    const { result } = renderHook(() => useCookie(COOKIE_NAME, INITIAL_VALUE));
    
    act(() => {
      result.current.setCookie(NEW_VALUE);
    });

    expect(Cookies.set).toHaveBeenCalledWith(
      COOKIE_NAME,
      JSON.stringify(NEW_VALUE),
      undefined,
    );
    expect(result.current.value).toEqual(NEW_VALUE);
  });

  it("should set a cookie with options", () => {
    const { result } = renderHook(() => useCookie(COOKIE_NAME, INITIAL_VALUE));
    const options = { expires: 7 };

    act(() => {
      result.current.setCookie(NEW_VALUE, options);
    });

    expect(Cookies.set).toHaveBeenCalledWith(
      COOKIE_NAME,
      JSON.stringify(NEW_VALUE),
      options,
    );
    expect(result.current.value).toEqual(NEW_VALUE);
  });

  it("should remove a cookie", () => {
    (Cookies.get as vi.Mock).mockReturnValue(JSON.stringify(INITIAL_VALUE)); // Simulate existing cookie
    const { result } = renderHook(() => useCookie(COOKIE_NAME, INITIAL_VALUE));
    
    expect(result.current.value).toEqual(INITIAL_VALUE);

    act(() => {
      result.current.removeCookie();
    });

    expect(Cookies.remove).toHaveBeenCalledWith(COOKIE_NAME);
    expect(result.current.value).toBeUndefined();
  });

  it("should handle error during cookie parsing", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (Cookies.get as vi.Mock).mockReturnValue("invalid json");
    
    const { result } = renderHook(() => useCookie(COOKIE_NAME, INITIAL_VALUE));
    expect(result.current.value).toEqual(INITIAL_VALUE); // Should fallback to initialValue
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should handle error during cookie setting", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (Cookies.set as vi.Mock).mockImplementation(() => {
      throw new Error("Failed to set cookie");
    });
    
    const { result } = renderHook(() => useCookie(COOKIE_NAME, INITIAL_VALUE));
    act(() => {
      result.current.setCookie(NEW_VALUE);
    });
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    // Value should not update if setting failed internally
    expect(result.current.value).toEqual(INITIAL_VALUE); 
    consoleErrorSpy.mockRestore();
  });

  it("should handle error during cookie removal", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (Cookies.remove as vi.Mock).mockImplementation(() => {
      throw new Error("Failed to remove cookie");
    });
    (Cookies.get as vi.Mock).mockReturnValue(JSON.stringify(INITIAL_VALUE)); // Simulate existing cookie
    const { result } = renderHook(() => useCookie(COOKIE_NAME, INITIAL_VALUE));
    
    act(() => {
      result.current.removeCookie();
    });
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    // Value should not update if removal failed internally
    expect(result.current.value).toEqual(INITIAL_VALUE); 
    consoleErrorSpy.mockRestore();
  });
});