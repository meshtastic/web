import type React from "react";
import { useEffect, useState } from "react";

import { Map, MapOptions } from "maplibre-gl";

export interface useMapboxProps {
  ref: React.RefObject<HTMLDivElement>;
  style: string;
  options?: Partial<MapOptions>;
}

export function useCreateMapbox({
  ref,
  style,
  options,
}: useMapboxProps): Map | undefined {
  const [mapInstance, setMapInstance] = useState<Map>();
  useEffect(() => {
    const container = ref.current as HTMLDivElement;
    if (mapInstance || !container) {
      return;
    }
    const map = new Map({
      container,
      style,
      ...options,
    });
    setMapInstance(map);
  }, []);

  return mapInstance;
}
