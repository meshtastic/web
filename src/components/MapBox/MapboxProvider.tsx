import React from 'react';

import mapbox from 'mapbox-gl';
import { renderToString } from 'react-dom/server';
import { FiAirplay } from 'react-icons/fi';

import {
  setBearing,
  setLatLng,
  setMapStyle,
  setPitch,
  setZoom,
} from '@core/slices/mapSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { useCreateMapbox } from '@hooks/useCreateMapbox';
import { Card } from '@meshtastic/components';

import { MapStyles } from '../Map/styles';
import { MapboxContext } from './mapboxContext';

export type MapboxProviderProps = {
  children: React.ReactNode;
};

export const MapboxProvider = ({
  children,
}: MapboxProviderProps): JSX.Element => {
  const darkMode = useAppSelector((state) => state.app.darkMode);
  const mapState = useAppSelector((state) => state.map);
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const dispatch = useAppDispatch();
  const ref = React.useRef<HTMLDivElement>(null);

  const [markers, setMarkers] = React.useState<
    { id: number; marker: mapbox.Marker }[]
  >([]);
  const [markerElements, setMarkerElements] = React.useState<
    { id: number; element: JSX.Element; ref: React.RefObject<HTMLDivElement> }[]
  >([]);

  const map = useCreateMapbox({
    ref,
    accessToken:
      'pk.eyJ1Ijoic2FjaGF3IiwiYSI6ImNrNW9meXozZjBsdW0zbHBjM2FnNnV6cmsifQ.3E4n8eFGD9ZOFo-XDVeZnQ',
    options: {
      center: mapState.latLng,
      zoom: mapState.zoom,
      bearing: mapState.bearing,
      pitch: mapState.pitch,
      style: mapState.style.url,
    },
  });

  const updateNodes = React.useCallback(() => {
    nodes.map((node) => {
      if (map?.loaded() && node.currentPosition) {
        const existingMarker = markers.find(
          (marker) => marker.id === node.number,
        )?.marker;

        const tmpRef = React.createRef<HTMLDivElement>();

        const markerElement = markerElements.find(
          (element) => element.id === node.number,
        ) ?? {
          element: (
            <div ref={tmpRef}>
              Test
              <FiAirplay />
            </div>
          ),
          id: node.number,
          ref: tmpRef,
        };

        console.log(markerElement);

        const marker =
          existingMarker ??
          new mapbox.Marker(markerElement.ref.current ?? undefined, {})
            .setLngLat([0, 0])
            .addTo(map);

        marker
          .setLngLat([
            node.currentPosition.longitudeI / 1e7,
            node.currentPosition.latitudeI / 1e7,
          ])
          .setPopup(
            new mapbox.Popup().setHTML(
              renderToString(
                <Card>
                  <div className="p-2">
                    <div className="text-xl font-medium">
                      {node.user?.longName}
                    </div>
                    <ul>
                      <li>ID: {node.number}</li>
                    </ul>
                  </div>
                </Card>,
              ),
            ),
          );

        if (!existingMarker) {
          setMarkers((markers) => [
            ...markers,
            {
              id: node.number,
              marker,
            },
          ]);
          setMarkerElements((markerElements) => [
            ...markerElements,
            markerElement,
          ]);
        }
      }
    });
  }, [markers, markerElements, map, nodes]);

  React.useEffect(() => {
    map?.on('load', () => {
      updateNodes();
    });
    map?.on('styledata', () => {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: mapState.exaggeration ? 1.5 : 0,
      });
    });
    map?.on('dragend', (e) => {
      dispatch(setLatLng(e.target.getCenter()));
    });
    map?.on('zoomend', (e) => {
      dispatch(setZoom(e.target.getZoom()));
    });
    map?.on('rotate', (e) => {
      dispatch(setBearing(e.target.getBearing()));
    });
    map?.on('pitch', (e) => {
      dispatch(setPitch(e.target.getPitch()));
    });
  }, [dispatch, map, updateNodes, mapState.exaggeration]);

  React.useEffect(() => {
    const center = map?.getCenter();
    if (center !== mapState.latLng) {
      map?.setCenter(mapState.latLng);
    }
  }, [map, mapState.latLng]);

  React.useEffect(() => {
    if (['Light', 'Dark'].includes(mapState.style.title)) {
      dispatch(setMapStyle(darkMode ? MapStyles.Dark : MapStyles.Light));
    }
  }, [dispatch, darkMode, mapState.style.title]);

  /**
   * Hill Shading
   */
  React.useEffect(() => {
    if (map?.loaded()) {
      if (mapState.hillShade) {
        map.addLayer(
          {
            id: 'hillshading',
            source: 'mapbox-dem',
            type: 'hillshade',
            // insert below waterway-river-canal-shadow;
            // where hillshading sits in the Mapbox Outdoors style
          },
          'waterway-river-canal-shadow',
        );
      } else {
        map.removeLayer('hillshading');
      }
    }
  }, [map, mapState.hillShade]);

  /**
   * Exaggeration
   */
  React.useEffect(() => {
    if (map?.loaded()) {
      map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: mapState.exaggeration ? 1.5 : 0,
      });
    }
  }, [map, mapState.exaggeration]);

  /**
   * Map Style
   */
  React.useEffect(() => {
    if (map?.loaded()) {
      map.setStyle(mapState.style.url);
    }
  }, [map, mapState.style]);

  /**
   * Markers
   */
  React.useEffect(() => {
    updateNodes();
  }, [nodes, updateNodes]);

  return (
    <MapboxContext.Provider value={{ map, ref }}>
      {children}
    </MapboxContext.Provider>
  );
};
