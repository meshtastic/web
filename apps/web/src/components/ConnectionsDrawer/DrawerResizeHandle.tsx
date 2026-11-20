import { cn } from "@core/utils/cn.ts";
import type { KeyboardEvent, PointerEvent } from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_DRAWER_WIDTH,
  DRAWER_RESIZE_BIG_STEP,
  DRAWER_RESIZE_STEP,
  type DrawerWidth,
} from "./useDrawerWidth.ts";

export interface DrawerResizeHandleProps {
  drawerWidth: DrawerWidth;
  /** The width being dragged, before it is stored. */
  onDraft: (width: number | undefined) => void;
}

/**
 * The left-edge resize handle of the right-hand drawer. Dragging shows a live
 * width and stores it on release; keys move 16px (64px with Shift), Home and
 * End go to the limits, Enter and double-click reset to the default.
 */
export function DrawerResizeHandle({
  drawerWidth,
  onDraft,
}: DrawerResizeHandleProps) {
  const { t } = useTranslation("connections");
  const { width, min, max, setWidth, reset } = drawerWidth;
  const drag = useRef<
    { pointerId: number; startX: number; startWidth: number } | undefined
  >(undefined);
  const [dragging, setDragging] = useState(false);

  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    // Resizing must never start vaul's drag-to-close.
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
    };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    // The drawer sits on the right: moving the handle left widens it.
    onDraft(clamp(current.startWidth + (current.startX - event.clientX)));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    drag.current = undefined;
    setDragging(false);
    setWidth(clamp(current.startWidth + (current.startX - event.clientX)));
    onDraft(undefined);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? DRAWER_RESIZE_BIG_STEP : DRAWER_RESIZE_STEP;
    let next: number | undefined;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        next = width + step;
        break;
      case "ArrowRight":
      case "ArrowDown":
        next = width - step;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      case "Enter":
        next = DEFAULT_DRAWER_WIDTH;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    setWidth(clamp(next));
  };

  // A focusable, draggable separator is a widget; <hr> can take neither focus
  // nor children, so the role is set explicitly.
  /* oxlint-disable jsx-a11y/prefer-tag-over-role */
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t("drawer.resize")}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      data-vaul-no-drag=""
      data-dragging={dragging ? "" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => reset()}
      onKeyDown={onKeyDown}
      className={cn(
        // A 12px hit area straddling the drawer's left edge.
        "group/handle absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center outline-none",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-10 w-1 rounded-full bg-muted-foreground/50 opacity-0 transition-opacity",
          "group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100 group-data-dragging/handle:opacity-100",
          "motion-reduce:transition-none",
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ring opacity-0 group-focus-visible/handle:opacity-100 group-data-dragging/handle:opacity-100"
      />
    </div>
  );
  /* oxlint-enable jsx-a11y/prefer-tag-over-role */
}
