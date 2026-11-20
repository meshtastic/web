import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DrawerResizeHandle } from "./DrawerResizeHandle.tsx";
import { DRAWER_WIDTH_KEY, useDrawerWidth } from "./useDrawerWidth.ts";

function Harness() {
  const drawerWidth = useDrawerWidth();
  const [draft, setDraft] = useState<number | undefined>(undefined);
  return (
    <div style={{ width: draft ?? drawerWidth.width }} data-testid="panel">
      <DrawerResizeHandle drawerWidth={drawerWidth} onDraft={setDraft} />
      <output data-testid="draft">{draft ?? ""}</output>
    </div>
  );
}

const handle = () => screen.getByRole("separator");
const valueNow = () => Number(handle().getAttribute("aria-valuenow"));
const stored = () => window.localStorage.getItem(DRAWER_WIDTH_KEY);

const setViewport = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

describe("DrawerResizeHandle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewport(1400);
    HTMLElement.prototype.setPointerCapture = () => {};
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("exposes the width as a vertical separator with its limits", () => {
    render(<Harness />);
    expect(handle().getAttribute("aria-orientation")).toBe("vertical");
    expect(valueNow()).toBe(440);
    expect(handle().getAttribute("aria-valuemin")).toBe("360");
    // min(960px, 75vw) at 1400px wide
    expect(handle().getAttribute("aria-valuemax")).toBe("960");
  });

  it("restores a stored width", () => {
    window.localStorage.setItem(DRAWER_WIDTH_KEY, "520");
    render(<Harness />);
    expect(valueNow()).toBe(520);
  });

  it("falls back to the default for invalid stored values", () => {
    for (const raw of ['"wide"', "null", "{}", "not json", "NaN"]) {
      window.localStorage.setItem(DRAWER_WIDTH_KEY, raw);
      const { unmount } = render(<Harness />);
      expect(valueNow()).toBe(440);
      unmount();
    }
  });

  it("clamps a stored width to the limits and re-clamps on resize", () => {
    window.localStorage.setItem(DRAWER_WIDTH_KEY, "5000");
    render(<Harness />);
    expect(valueNow()).toBe(960);

    act(() => {
      setViewport(800);
      window.dispatchEvent(new Event("resize"));
    });
    expect(handle().getAttribute("aria-valuemax")).toBe("600");
    expect(valueNow()).toBe(600);
  });

  it("moves with the keyboard and stores the result", () => {
    render(<Harness />);
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(valueNow()).toBe(456);
    fireEvent.keyDown(handle(), { key: "ArrowRight", shiftKey: true });
    expect(valueNow()).toBe(392);
    fireEvent.keyDown(handle(), { key: "Home" });
    expect(valueNow()).toBe(360);
    fireEvent.keyDown(handle(), { key: "End" });
    expect(valueNow()).toBe(960);
    fireEvent.keyDown(handle(), { key: "Enter" });
    expect(valueNow()).toBe(440);
    expect(stored()).toBe("440");
  });

  it("drags from the left edge, previews, then stores on release", () => {
    render(<Harness />);
    const el = handle();

    fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: 900 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 800 });
    expect(screen.getByTestId("draft").textContent).toBe("540");
    expect(stored()).toBeNull();

    fireEvent.pointerUp(el, { pointerId: 1, clientX: 780 });
    expect(screen.getByTestId("draft").textContent).toBe("");
    expect(valueNow()).toBe(560);
    expect(stored()).toBe("560");
  });

  it("never lets a drag go past the limits", () => {
    render(<Harness />);
    const el = handle();
    fireEvent.pointerDown(el, { button: 0, pointerId: 2, clientX: 900 });
    fireEvent.pointerUp(el, { pointerId: 2, clientX: 2500 });
    expect(valueNow()).toBe(360);
    fireEvent.pointerDown(el, { button: 0, pointerId: 3, clientX: 900 });
    fireEvent.pointerUp(el, { pointerId: 3, clientX: -2000 });
    expect(valueNow()).toBe(960);
  });

  it("stops the pointer event so vaul's drag-to-close never starts", () => {
    let reachedParent = false;
    render(
      <div onPointerDown={() => (reachedParent = true)}>
        <Harness />
      </div>,
    );
    fireEvent.pointerDown(handle(), { button: 0, pointerId: 4, clientX: 10 });
    expect(reachedParent).toBe(false);
    expect(handle().hasAttribute("data-vaul-no-drag")).toBe(true);
  });

  it("resets on double-click", () => {
    window.localStorage.setItem(DRAWER_WIDTH_KEY, "700");
    render(<Harness />);
    fireEvent.doubleClick(handle());
    expect(valueNow()).toBe(440);
  });
});
