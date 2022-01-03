import 'mapbox-gl/dist/mapbox-gl.css';

import React from 'react';

import mapboxgl from 'mapbox-gl';

type AccessToken = string;

export interface useMapboxProps {
  ref: React.RefObject<HTMLDivElement>;
  accessToken: AccessToken;
  options?: Partial<mapboxgl.MapboxOptions>;
}

export function useCreateMapbox({
  ref,
  accessToken,
  options,
}: useMapboxProps): mapboxgl.Map | undefined {
  const [mapInstance, setMapInstance] = React.useState<mapboxgl.Map>();
  React.useEffect(() => {
    const container = ref.current as HTMLDivElement;
    if (mapInstance || !container) {
      return;
    }
    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container,
      antialias: true,
      ...options,
    });
    setMapInstance(map);
  }, []);

  return mapInstance;
}
