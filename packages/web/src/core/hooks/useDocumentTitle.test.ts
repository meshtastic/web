import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDocumentTitle } from "./useDocumentTitle.ts";

describe("useDocumentTitle", () => {
  const originalTitle = "Meshtastic";

  beforeEach(() => {
    document.title = originalTitle;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it("should stash the original document title on mount", () => {
    renderHook(() => useDocumentTitle("Test"));
    expect(document.title).toBe("Test - Meshtastic");
  });

  it("should prepend prefix to original title", () => {
    renderHook(() => useDocumentTitle("My Connection"));
    expect(document.title).toBe("My Connection - Meshtastic");
  });

  it("should restore original title when prefix is empty", () => {
    renderHook(() => useDocumentTitle(""));
    expect(document.title).toBe(originalTitle);
  });

  it("should restore original title on unmount", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Test"));
    expect(document.title).toBe("Test - Meshtastic");

    unmount();
    expect(document.title).toBe(originalTitle);
  });

  it("should update document title when prefix changes", () => {
    const { rerender } = renderHook(
      ({ prefix }) => useDocumentTitle(prefix),
      {
        initialProps: { prefix: "Connection 1" },
      },
    );

    expect(document.title).toBe("Connection 1 - Meshtastic");

    rerender({ prefix: "Connection 2" });
    expect(document.title).toBe("Connection 2 - Meshtastic");
  });

  it("should not update document title if computed title hasn't changed", () => {
    const { rerender } = renderHook(
      ({ prefix }) => useDocumentTitle(prefix),
      {
        initialProps: { prefix: "Test" },
      },
    );

    const titleBefore = document.title;
    rerender({ prefix: "Test" });
    expect(document.title).toBe(titleBefore);
  });

  it("should always use the original stashed title from initial mount", () => {
    document.title = "Meshtastic";

    const { unmount: unmount1 } = renderHook(() =>
      useDocumentTitle("First"),
    );
    expect(document.title).toBe("First - Meshtastic");

    unmount1();
    expect(document.title).toBe("Meshtastic");

    // Second mount should use the restored original title
    const { unmount: unmount2 } = renderHook(() =>
      useDocumentTitle("Second"),
    );
    expect(document.title).toBe("Second - Meshtastic");

    unmount2();
    expect(document.title).toBe("Meshtastic");
  });

  it("should handle switching from non-empty to empty prefix", () => {
    const { rerender } = renderHook(
      ({ prefix }) => useDocumentTitle(prefix),
      {
        initialProps: { prefix: "Connection" },
      },
    );

    expect(document.title).toBe("Connection - Meshtastic");

    rerender({ prefix: "" });
    expect(document.title).toBe(originalTitle);
  });

  it("should handle switching from empty to non-empty prefix", () => {
    const { rerender } = renderHook(
      ({ prefix }) => useDocumentTitle(prefix),
      {
        initialProps: { prefix: "" },
      },
    );

    expect(document.title).toBe(originalTitle);

    rerender({ prefix: "Connection" });
    expect(document.title).toBe("Connection - Meshtastic");
  });
});
