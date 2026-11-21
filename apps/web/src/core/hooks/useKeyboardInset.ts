import { keyboardInset } from "@core/viewport/keyboardInset.ts";
import { useEffect } from "react";

/** CSS custom property the app shell subtracts from its `dvh` height. */
export const KEYBOARD_INSET_VAR = "--keyboard-inset";

/**
 * Publishes how much of the page an overlaying on-screen keyboard covers
 * as `--keyboard-inset` on the root element, so the shell can shrink and
 * keep the composer above the keyboard.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const viewport = globalThis.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      const inset = keyboardInset({
        layoutHeight: globalThis.innerHeight,
        visibleHeight: viewport.height,
        offsetTop: viewport.offsetTop,
        scale: viewport.scale,
      });
      root.style.setProperty(KEYBOARD_INSET_VAR, `${inset}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty(KEYBOARD_INSET_VAR);
    };
  }, []);
}
