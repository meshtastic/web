import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import type { LngLatLike, MarkerOptions } from 'mapbox-gl';
import { Marker as MapboxMarker } from 'mapbox-gl';

import { useMapbox } from '@hooks/useMapbox';

export interface MarkerProps extends Omit<MarkerOptions, 'element'> {
  children?: React.ReactNode;
  center: LngLatLike;
}

export const Marker = ({
  children,
  center,
  ...props
}: MarkerProps): JSX.Element => {
  const { map } = useMapbox();
  const ref = useRef<HTMLDivElement>(document.createElement('div'));

  const addMarker = useCallback((): void => {
    if (map) {
      const marker = new MapboxMarker(ref.current, props).setLngLat(center);
      marker.addTo(map);
    }
  }, [map, center, props]);

  useEffect(() => {
    map?.on('load', () => {
      addMarker();
    });
  }, [addMarker, map]);

  useEffect(() => {
    if (map?.loaded()) {
      addMarker();
    }
  }, [addMarker, map]);

  <div ref={ref}>{children}</div>;

  return createPortal(children, ref.current);
};
