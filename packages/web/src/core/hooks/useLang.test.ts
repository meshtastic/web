import { FALLBACK_LANGUAGE_CODE } from "@app/i18n-config";
import { act, renderHook } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useLang from "./useLang.ts";
import useLocalStorage from "@shared/hooks/useLocalStorage";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: vi.fn(),
}));

// Mock useLocalStorage
vi.mock("@shared/hooks/useLocalStorage", () => ({
  default: vi.fn(),
}));

// Mock i18n-config
vi.mock("@app/i18n-config", () => ({
  FALLBACK_LANGUAGE_CODE: "en",
  supportedLanguages: [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
  ],
}));

describe("useLang", () => {
  const mockChangeLanguage = vi.fn();
  const mockSetLanguageInStorage = vi.fn();
  const initialLanguage = "en";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useTranslation
    (useTranslation as vi.Mock).mockReturnValue({
      i18n: {
        language: initialLanguage,
        changeLanguage: mockChangeLanguage.mockResolvedValue(undefined),
      },
      t: (key: string) => key, // Simple mock for t function
    });

    // Mock useLocalStorage
    (useLocalStorage as vi.Mock).mockReturnValue([
      null,
      mockSetLanguageInStorage,
    ]);

    // Mock Intl.Collator as a class-like constructor
    class MockCollator {
      private locale: string;
      private options: Intl.CollatorOptions;

      constructor(locale: string, options: Intl.CollatorOptions) {
        this.locale = locale;
        this.options = options;
      }

      compare = (a: string, b: string) =>
        a.localeCompare(b, this.locale, this.options);
    }
    vi.spyOn(global.Intl, "Collator" as any).mockImplementation(MockCollator);
  });

  it("should return the current language", () => {
    const { result } = renderHook(() => useLang());
    expect(result.current.current?.code).toBe(initialLanguage);
  });

  it("should return supported languages sorted by name", () => {
    const { result } = renderHook(() => useLang());
    expect(result.current.getSupportedLangs).toEqual([
      { code: "en", name: "English" },
      { code: "es", name: "Español" },
    ]);
  });

  it("should change the language and persist it by default", async () => {
    const { result } = renderHook(() => useLang());

    await act(async () => {
      await result.current.set("es");
    });

    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
    expect(mockSetLanguageInStorage).toHaveBeenCalledWith({ language: "es" });
  });

  it("should change the language but not persist if persist is false", async () => {
    const { result } = renderHook(() => useLang());

    await act(async () => {
      await result.current.set("es", false);
    });

    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
    expect(mockSetLanguageInStorage).not.toHaveBeenCalled();
  });

  it("should not change language if it's already the current language", async () => {
    const { result } = renderHook(() => useLang());

    await act(async () => {
      await result.current.set(initialLanguage);
    });

    expect(mockChangeLanguage).not.toHaveBeenCalled();
    expect(mockSetLanguageInStorage).not.toHaveBeenCalled();
  });

  it("should compare strings using collator", () => {
    const { result } = renderHook(() => useLang());
    expect(result.current.compare("apple", "banana")).toBeLessThan(0);
    expect(result.current.compare("banana", "apple")).toBeGreaterThan(0);
    expect(result.current.compare("apple", "apple")).toBe(0);
  });

  it("should handle language change failure gracefully", async () => {
    mockChangeLanguage.mockRejectedValueOnce(new Error("Failed to load lang"));
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useLang());

    await act(async () => {
      await result.current.set("es");
    });

    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Failed to change language:",
      expect.any(Error),
    );
    consoleWarnSpy.mockRestore();
  });

  it("should fallback to FALLBACK_LANGUAGE_CODE if current i18n language is not supported", () => {
    (useTranslation as vi.Mock).mockReturnValue({
      i18n: {
        language: "fr", // Unsupported language
        changeLanguage: mockChangeLanguage.mockResolvedValue(undefined),
      },
      t: (key: string) => key,
    });

    const { result } = renderHook(() => useLang());
    expect(result.current.current?.code).toBe(FALLBACK_LANGUAGE_CODE);
  });
});
