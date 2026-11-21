import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** How long a touch must be held. */
export const LONG_PRESS_MS = 450;
/** Moving further than this (px) is a scroll, not a press. */
const MOVE_TOLERANCE = 10;
/** A click this soon after a long-press fired is the press lifting. */
const SWALLOW_CLICK_MS = 600;

export interface LongPressHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  /** Stops the browser's own long-press menu during a touch press. */
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  /** Swallows the click that ends a long-press, so it doesn't activate. */
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
}

export interface LongPress {
  readonly handlers: LongPressHandlers;
  /** A touch is held on the element: suppress text selection and callouts. */
  readonly pressing: boolean;
}

/**
 * Calls `onLongPress` when a touch (not mouse or pen) is held in place, so
 * touch users can open what mouse users get on hover.
 */
export function useLongPress(onLongPress: () => void): LongPress {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | undefined>(undefined);
  const firedAt = useRef<number | undefined>(undefined);
  const callback = useRef(onLongPress);
  const [pressing, setPressing] = useState(false);
  useEffect(() => {
    callback.current = onLongPress;
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timer.current !== undefined) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
    origin.current = undefined;
    setPressing(false);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== undefined) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const handlers = useMemo<LongPressHandlers>(
    () => ({
      onPointerDown: (event) => {
        if (event.pointerType !== "touch") {
          return;
        }
        cancel();
        firedAt.current = undefined;
        origin.current = { x: event.clientX, y: event.clientY };
        setPressing(true);
        timer.current = setTimeout(() => {
          timer.current = undefined;
          firedAt.current = Date.now();
          callback.current();
        }, LONG_PRESS_MS);
      },
      onPointerMove: (event) => {
        const start = origin.current;
        if (
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) >
            MOVE_TOLERANCE
        ) {
          cancel();
        }
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onContextMenu: (event) => {
        if (origin.current !== undefined || firedAt.current !== undefined) {
          event.preventDefault();
        }
      },
      onClickCapture: (event) => {
        const fired = firedAt.current;
        firedAt.current = undefined;
        if (fired !== undefined && Date.now() - fired < SWALLOW_CLICK_MS) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    }),
    [cancel],
  );

  return { handlers, pressing };
}
