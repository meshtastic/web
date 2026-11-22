import {
  clampDetailsWidth,
  detailsWidthForKey,
} from "@core/shell/detailsWidth.ts";
import { cn } from "@core/utils/cn.ts";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";

export interface DetailsResizeHandleProps {
  /** Accessible name, e.g. "Resize Channel details". */
  label: string;
  width: number;
  min: number;
  max: number;
  /** The width being dragged, before it is stored; `undefined` when done. */
  onDraft: (width: number | undefined) => void;
  /** Stores a width. */
  onResize: (width: number) => void;
  /** Back to the default width. */
  onReset: () => void;
}

/**
 * The details column's left-edge separator. Dragging shows a live width and
 * stores it on release; Left/Right move 16px (64px with Shift), Home and
 * End go to the limits, double-click resets to the default.
 */
export function DetailsResizeHandle({
  label,
  width,
  min,
  max,
  onDraft,
  onResize,
  onReset,
}: DetailsResizeHandleProps) {
  const drag = useRef<
    { pointerId: number; startX: number; startWidth: number } | undefined
  >(undefined);
  const [dragging, setDragging] = useState(false);

  // The panel sits on the right: moving the handle left widens it.
  const widthAt = (
    current: { startX: number; startWidth: number },
    clientX: number,
  ) => clampDetailsWidth(current.startWidth + (current.startX - clientX), max);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
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
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    onDraft(widthAt(current, event.clientX));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) {
      return;
    }
    drag.current = undefined;
    setDragging(false);
    onResize(widthAt(current, event.clientX));
    onDraft(undefined);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = detailsWidthForKey(event, width, max);
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    onResize(next);
  };

  // A focusable, draggable separator is a widget; <hr> can take neither
  // focus nor children, so the role is set explicitly.
  /* oxlint-disable jsx-a11y/prefer-tag-over-role */
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      data-dragging={dragging ? "" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      // A 12px hit area straddling the panel's left border.
      className="group/handle absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center outline-none"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-accent opacity-0 transition-opacity motion-reduce:transition-none",
          "group-hover/handle:opacity-60 group-data-dragging/handle:opacity-100",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none h-10 w-1.5 rounded-full bg-raised opacity-0 outline-offset-2 transition-opacity motion-reduce:transition-none",
          "group-hover/handle:opacity-100 group-data-dragging/handle:opacity-100",
          "group-focus-visible/handle:opacity-100 group-focus-visible/handle:outline-2 group-focus-visible/handle:outline-focus",
        )}
      />
    </div>
  );
  /* oxlint-enable jsx-a11y/prefer-tag-over-role */
}
