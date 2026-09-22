import useLang from "@core/hooks/useLang.ts";
import { act, renderHook } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, describe, expect, it } from "vitest";

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("useLang().current", () => {
  it.each([
    ["en", "en"],
    // A US/GB browser resolves to the shipped `en` locale folder, but i18next
    // may still report the regional code — the picker must not fall over.
    ["en-US", "en"],
    ["en-GB", "en"],
    // Bare picker codes resolve to region qualified folders (`fi` -> `fi-FI`).
    ["fi-FI", "fi"],
    ["de-DE", "de"],
    ["sv-SE", "sv"],
  ])("reports %s as the %s picker entry", async (active, expected) => {
    // Mirror production: the locale folder for this language really is loaded.
    i18n.addResourceBundle(active, "common", { button: { cancel: "x" } });
    await act(async () => {
      await i18n.changeLanguage(active);
    });

    const { result } = renderHook(() => useLang());

    expect(result.current.current?.code).toBe(expected);
  });

  it("falls back to English for a language we do not ship", async () => {
    await act(async () => {
      await i18n.changeLanguage("th-TH");
    });

    const { result } = renderHook(() => useLang());

    expect(result.current.current?.code).toBe("en");
  });
});
