import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KEYBOARD_INSET_VAR, useKeyboardInset } from "./useKeyboardInset.ts";

/** A stand-in `visualViewport` whose size the test changes. */
class FakeVisualViewport extends EventTarget {
  height = 844;
  offsetTop = 0;
  scale = 1;
}

const realViewport = Object.getOwnPropertyDescriptor(
  globalThis,
  "visualViewport",
);
const realInnerHeight = globalThis.innerHeight;
let viewport: FakeVisualViewport;

beforeEach(() => {
  viewport = new FakeVisualViewport();
  Object.defineProperty(globalThis, "visualViewport", {
    configurable: true,
    value: viewport,
  });
  globalThis.innerHeight = 844;
});

afterEach(() => {
  if (realViewport) {
    Object.defineProperty(globalThis, "visualViewport", realViewport);
  } else {
    Reflect.deleteProperty(globalThis, "visualViewport");
  }
  globalThis.innerHeight = realInnerHeight;
});

const inset = () =>
  document.documentElement.style.getPropertyValue(KEYBOARD_INSET_VAR);

describe("useKeyboardInset", () => {
  it("publishes 0 with no keyboard", () => {
    renderHook(() => useKeyboardInset());
    expect(inset()).toBe("0px");
  });

  it("follows a keyboard overlaying the page, and clears up on unmount", () => {
    const { unmount } = renderHook(() => useKeyboardInset());

    act(() => {
      viewport.height = 500;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(inset()).toBe("344px");

    act(() => {
      viewport.offsetTop = 100;
      viewport.dispatchEvent(new Event("scroll"));
    });
    expect(inset()).toBe("244px");

    unmount();
    expect(inset()).toBe("");
  });
});
