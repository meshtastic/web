import type { MapRef } from "react-map-gl/maplibre";

interface BoundingBoxOverlayProps {
  mapRef: MapRef;
  start: [number, number];
  current: [number, number];
}

export const BoundingBoxOverlay = ({ mapRef, start, current }: BoundingBoxOverlayProps) => {
  const map = mapRef.getMap();
  if (!map) return null;
  const rect = map.getContainer().getBoundingClientRect();
  const a = map.project(start);
  const b = map.project(current);
  const left = Math.min(a.x, b.x) + rect.left;
  const top = Math.min(a.y, b.y) + rect.top;
  const width = Math.abs(a.x - b.x);
  const height = Math.abs(a.y - b.y);
  return (
    <div
      className="pointer-events-none fixed border-2 border-amber-500 bg-amber-500/20"
      style={{ left, top, width, height }}
    />
  );
};
