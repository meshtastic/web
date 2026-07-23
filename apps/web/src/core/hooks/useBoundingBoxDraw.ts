import { useCallback, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export type BoundingBoxResult = {
  west: number;
  south: number;
  east: number;
  north: number;
};

interface DrawState {
  active: boolean;
  start?: [number, number];
  current?: [number, number];
}

/**
 * Drag-to-define rectangular selector on a MapLibre map. Returns a state
 * object plus a `beginDraw` promise-based API for callers (the editor
 * dialog) to await a result. Matches design#114 "Set / Edit / Remove
 * Bounding Box opens a drag-to-define rectangle on the map."
 */
export function useBoundingBoxDraw(mapRef: MapRef | undefined) {
  const [state, setState] = useState<DrawState>({ active: false });
  const startRef = useRef<[number, number] | undefined>(undefined);
  const currentRef = useRef<[number, number] | undefined>(undefined);
  const resolverRef = useRef<((box: BoundingBoxResult | undefined) => void) | undefined>(undefined);

  const beginDraw = useCallback((): Promise<BoundingBoxResult | undefined> => {
    return new Promise((resolve) => {
      resolverRef.current?.(undefined);
      resolverRef.current = resolve;
      startRef.current = undefined;
      currentRef.current = undefined;
      setState({ active: true });
    });
  }, []);

  const cancelDraw = useCallback(() => {
    resolverRef.current?.(undefined);
    resolverRef.current = undefined;
    startRef.current = undefined;
    currentRef.current = undefined;
    setState({ active: false });
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const map = mapRef?.getMap();
      if (!map) return;
      const rect = map.getContainer().getBoundingClientRect();
      const lngLat = map.unproject([event.clientX - rect.left, event.clientY - rect.top]);
      startRef.current = [lngLat.lng, lngLat.lat];
      currentRef.current = [lngLat.lng, lngLat.lat];
      setState({ active: true, start: startRef.current, current: currentRef.current });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [mapRef],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!startRef.current) return;
      const map = mapRef?.getMap();
      if (!map) return;
      const rect = map.getContainer().getBoundingClientRect();
      const lngLat = map.unproject([event.clientX - rect.left, event.clientY - rect.top]);
      currentRef.current = [lngLat.lng, lngLat.lat];
      setState((s) => ({ ...s, current: currentRef.current }));
    },
    [mapRef],
  );

  const onPointerUp = useCallback((event: React.PointerEvent) => {
    let box: BoundingBoxResult | undefined;
    if (startRef.current && currentRef.current) {
      const [x1, y1] = startRef.current;
      const [x2, y2] = currentRef.current;
      const west = Math.min(x1, x2);
      const east = Math.max(x1, x2);
      const south = Math.min(y1, y2);
      const north = Math.max(y1, y2);
      if (Math.abs(east - west) > 1e-6 && Math.abs(north - south) > 1e-6) {
        box = { west, south, east, north };
      }
    }
    startRef.current = undefined;
    currentRef.current = undefined;
    setState({ active: false });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resolverRef.current?.(box);
    resolverRef.current = undefined;
  }, []);

  const overlay = state.active
    ? {
        start: state.start,
        current: state.current,
      }
    : undefined;

  return {
    active: state.active,
    overlay,
    beginDraw,
    cancelDraw,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
