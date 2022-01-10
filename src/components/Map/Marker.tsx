import React from 'react';
import ReactDOM from 'react-dom';

import mapbox from 'mapbox-gl';
import ReactDOMServer from 'react-dom/server';

import { useMapbox } from '@hooks/useMapbox';

export interface MarkerProps extends Omit<mapbox.MarkerOptions, 'element'> {
  children?: React.ReactNode;
  center: mapbox.LngLatLike;
  popup: JSX.Element;
}

export const Marker = ({
  children,
  center,
  popup,
  ...props
}: MarkerProps): JSX.Element => {
  const { map } = useMapbox();
  const ref = React.useRef<HTMLDivElement>(document.createElement('div'));

  const addMarker = React.useCallback((): void => {
    if (map) {
      const marker = new mapbox.Marker(ref.current, props)
        .setLngLat(center)
        .setPopup(
          new mapbox.Popup().setHTML(ReactDOMServer.renderToString(popup)),
        );
      marker.addTo(map);
    }
  }, [map, center, props, popup]);

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
