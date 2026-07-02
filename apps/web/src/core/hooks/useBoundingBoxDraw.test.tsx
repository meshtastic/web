import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBoundingBoxDraw } from "./useBoundingBoxDraw.ts";

function makeMapRef(unprojectFn: (pt: [number, number]) => { lng: number; lat: number }) {
  const container = {
    getBoundingClientRect: () => ({ left: 0, top: 0 }) as DOMRect,
  } as HTMLElement;
  const map = {
    unproject: vi.fn(unprojectFn),
    getContainer: () => container,
  };
  return {
    getMap: () => map,
  } as unknown as Parameters<typeof useBoundingBoxDraw>[0];
}

function makePointerEvent(x: number, y: number, pointerId = 1): React.PointerEvent {
  const target = {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    hasPointerCapture: vi.fn().mockReturnValue(true),
  };
  return {
    clientX: x,
    clientY: y,
    pointerId,
    currentTarget: target,
  } as unknown as React.PointerEvent;
}

describe("useBoundingBoxDraw", () => {
  it("returns undefined without a map", async () => {
    const { result } = renderHook(() => useBoundingBoxDraw(undefined));
    let value: unknown;
    await act(async () => {
      const promise = result.current.beginDraw();
      result.current.cancelDraw();
      value = await promise;
    });
    expect(value).toBeUndefined();
    expect(result.current.active).toBe(false);
  });

  it("resolves with normalized WSEN box after drag", async () => {
    const mapRef = makeMapRef(([x, y]) => ({ lng: x / 10, lat: y / 10 }));
    const { result } = renderHook(() => useBoundingBoxDraw(mapRef));

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.beginDraw();
    });
    expect(result.current.active).toBe(true);

    act(() => {
      result.current.onPointerDown(makePointerEvent(100, 200));
    });
    act(() => {
      result.current.onPointerMove(makePointerEvent(300, 50));
    });
    act(() => {
      result.current.onPointerUp(makePointerEvent(300, 50));
    });

    const box = (await promise!) as { west: number; south: number; east: number; north: number };
    expect(box.west).toBe(10);
    expect(box.east).toBe(30);
    expect(box.south).toBe(5);
    expect(box.north).toBe(20);
    expect(result.current.active).toBe(false);
  });

  it("resolves undefined on zero-area drag", async () => {
    const mapRef = makeMapRef(([x, y]) => ({ lng: x, lat: y }));
    const { result } = renderHook(() => useBoundingBoxDraw(mapRef));
    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.beginDraw();
    });
    act(() => {
      result.current.onPointerDown(makePointerEvent(50, 50));
    });
    act(() => {
      result.current.onPointerUp(makePointerEvent(50, 50));
    });
    const box = await promise!;
    expect(box).toBeUndefined();
  });

  it("cancelDraw resolves outstanding promise as undefined", async () => {
    const mapRef = makeMapRef(([x, y]) => ({ lng: x, lat: y }));
    const { result } = renderHook(() => useBoundingBoxDraw(mapRef));
    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.beginDraw();
    });
    act(() => {
      result.current.cancelDraw();
    });
    const box = await promise!;
    expect(box).toBeUndefined();
    expect(result.current.active).toBe(false);
  });
});
