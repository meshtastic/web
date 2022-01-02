import 'mapbox-gl/dist/mapbox-gl.css';

import React from 'react';

import mapboxgl from 'mapbox-gl';

type AccessToken = string;

export function useMapbox(
  ref: React.RefObject<HTMLDivElement>,
  accessToken: AccessToken,
  options?: Partial<mapboxgl.MapboxOptions>,
): mapboxgl.Map | undefined {
  const [mapInstance, setMapInstance] = React.useState<mapboxgl.Map>();
  React.useEffect(() => {
    const container = ref.current;
    if (mapInstance || !container) {
      return;
    }

    mapboxgl.accessToken = accessToken;
    const mergedOptions = { container, ...options };
    const map = new mapboxgl.Map(mergedOptions);
    setMapInstance(map);
  }, [ref, accessToken, options, mapInstance]);

  return mapInstance;
}
