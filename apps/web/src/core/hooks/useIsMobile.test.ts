import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useIsMobile } from "./useIsMobile.ts";

const realMatchMedia = globalThis.matchMedia;
let listeners: Array<() => void> = [];
let matches = false;
let queries: string[] = [];

/** Pin what the media query reports, and record the query it was asked. */
function setViewport(isMobile: boolean) {
  matches = isMobile;
  globalThis.matchMedia = ((query: string) => {
    queries.push(query);
    return {
      get matches() {
        return matches;
      },
      media: query,
      addEventListener: (_: string, cb: () => void) => {
        listeners.push(cb);
      },
      removeEventListener: (_: string, cb: () => void) => {
        listeners = listeners.filter((l) => l !== cb);
      },
    };
  }) as unknown as typeof globalThis.matchMedia;
}

/** Cross the breakpoint the way a window resize would. */
function resizeTo(isMobile: boolean) {
  matches = isMobile;
  act(() => {
    for (const l of [...listeners]) l();
  });
}

afterEach(() => {
  globalThis.matchMedia = realMatchMedia;
  listeners = [];
  queries = [];
});

describe("useIsMobile", () => {
  it("should report false at or above the md breakpoint", () => {
    setViewport(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should report true below the md breakpoint", () => {
    setViewport(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should query the md breakpoint in rem, matching the Tailwind theme", () => {
    setViewport(false);
    renderHook(() => useIsMobile());
    expect(queries[0]).toBe("not all and (min-width: 48rem)");
  });

  it("should follow the viewport across the breakpoint", () => {
    setViewport(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    resizeTo(true);
    expect(result.current).toBe(true);

    resizeTo(false);
    expect(result.current).toBe(false);
  });

  it("should stop listening once unmounted", () => {
    setViewport(true);
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners).toHaveLength(1);

    unmount();
    expect(listeners).toHaveLength(0);
  });
});
