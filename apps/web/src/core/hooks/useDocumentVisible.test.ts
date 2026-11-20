import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useDocumentVisible } from "./useDocumentVisible.ts";

/** Report a visibility state and fire the event a tab switch would. */
function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

afterEach(() => {
  setVisibility("visible");
});

describe("useDocumentVisible", () => {
  it("should report true while the tab is visible", () => {
    const { result } = renderHook(() => useDocumentVisible());
    expect(result.current).toBe(true);
  });

  it("should follow the tab being hidden and shown again", () => {
    const { result } = renderHook(() => useDocumentVisible());

    setVisibility("hidden");
    expect(result.current).toBe(false);

    setVisibility("visible");
    expect(result.current).toBe(true);
  });
});
