/** What the browser reports about the visible part of the page. */
export interface VisualViewportMetrics {
  /** Layout viewport height (`window.innerHeight`). */
  layoutHeight: number;
  /** Visible height (`visualViewport.height`). */
  visibleHeight: number;
  /** How far the visible area is panned down (`visualViewport.offsetTop`). */
  offsetTop: number;
  /** Pinch zoom (`visualViewport.scale`). */
  scale: number;
}

/** Smaller gaps are browser chrome settling, not a keyboard. */
const MIN_KEYBOARD_PX = 80;

/**
 * How much of the bottom of the layout viewport an on-screen keyboard
 * covers, in CSS pixels. Browsers that resize the layout viewport for the
 * keyboard (`interactive-widget=resizes-content`) report 0 here, so the
 * shell's `dvh` height already fits; Safari overlays the keyboard instead,
 * and the shell shrinks by this much to keep the composer in view.
 * Pinch-zoom also shrinks the visible area, so a zoomed page reports 0.
 */
export function keyboardInset({
  layoutHeight,
  visibleHeight,
  offsetTop,
  scale,
}: VisualViewportMetrics): number {
  if (scale > 1.01) return 0;
  const covered = Math.round(layoutHeight - visibleHeight - offsetTop);
  return covered >= MIN_KEYBOARD_PX ? covered : 0;
}
