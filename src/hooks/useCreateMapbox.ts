import 'mapbox-gl/dist/mapbox-gl.css';

import type React from 'react';
import { useEffect, useState } from 'react';

import { Map, MapboxOptions } from 'mapbox-gl';

export interface useMapboxProps {
  ref: React.RefObject<HTMLDivElement>;
  accessToken: string;
  options?: Partial<MapboxOptions>;
}

export function useCreateMapbox({
  ref,
  accessToken,
  options,
}: useMapboxProps): Map | undefined {
  const [mapInstance, setMapInstance] = useState<Map>();
  useEffect(() => {
    const container = ref.current as HTMLDivElement;
    if (mapInstance || !container) {
      return;
    }
    const map = new Map({
      accessToken,
      container,
      antialias: true,
      ...options,
    });
    setMapInstance(map);
  }, []);

  return mapInstance;
}
