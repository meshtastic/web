import { describe, expect, it } from "vitest";
import { keyboardInset } from "./keyboardInset.ts";

const metrics = {
  layoutHeight: 844,
  visibleHeight: 844,
  offsetTop: 0,
  scale: 1,
};

describe("keyboardInset", () => {
  it("is 0 with no keyboard", () => {
    expect(keyboardInset(metrics)).toBe(0);
  });

  it("is the covered height when a keyboard overlays the page", () => {
    expect(keyboardInset({ ...metrics, visibleHeight: 508 })).toBe(336);
  });

  it("subtracts the distance the visible area is panned down", () => {
    expect(
      keyboardInset({ ...metrics, visibleHeight: 508, offsetTop: 120 }),
    ).toBe(216);
  });

  it("is 0 when the browser resized the layout for the keyboard", () => {
    expect(
      keyboardInset({ ...metrics, layoutHeight: 508, visibleHeight: 508 }),
    ).toBe(0);
  });

  it("ignores small gaps from collapsing browser chrome", () => {
    expect(keyboardInset({ ...metrics, visibleHeight: 790 })).toBe(0);
  });

  it("ignores pinch zoom", () => {
    expect(keyboardInset({ ...metrics, visibleHeight: 400, scale: 2 })).toBe(0);
  });
});
