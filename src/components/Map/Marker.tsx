import React from 'react';
import ReactDOM from 'react-dom';

import mapbox from 'mapbox-gl';

import { useMapbox } from '@hooks/useMapbox';

export interface MarkerProps extends Omit<mapbox.MarkerOptions, 'element'> {
  children?: React.ReactNode;
  center: mapbox.LngLatLike;
}

export const Marker = ({
  children,
  center,
  ...props
}: MarkerProps): JSX.Element => {
  const { map } = useMapbox();
  const ref = React.useRef<HTMLDivElement>(document.createElement('div'));

  const addMarker = React.useCallback((): void => {
    if (map) {
      const marker = new mapbox.Marker(ref.current, props).setLngLat(center);
      marker.addTo(map);
    }
  }, [map, center, props]);

  React.useEffect(() => {
    map?.on('load', () => {
      addMarker();
    });
  }, [addMarker, map]);

  React.useEffect(() => {
    if (map?.loaded()) {
      addMarker();
    }
  }, [addMarker, map]);

  <div ref={ref}>{children}</div>;

  return ReactDOM.createPortal(children, ref.current);
};
