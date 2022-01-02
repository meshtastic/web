import React from 'react';

import mapboxgl from 'mapbox-gl';
import { renderToString } from 'react-dom/server';
import { FaDirections, FaGlobeAfrica, FaMountain } from 'react-icons/fa';
import { MdFullscreen, MdRadar, MdWbShade } from 'react-icons/md';

import { useMapbox } from '@app/hooks/mapbox';
import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import {
  setExaggeration,
  setHillShade,
  setLatLng,
  setMapStyle,
  setZoom,
} from '@core/slices/mapSlice';
import { Card, IconButton } from '@meshtastic/components';

import type { MapStyle } from './styles';
import { MapStyles } from './styles';

export const Map = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.app.darkMode);
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const mapState = useAppSelector((state) => state.map);
  const [markers, setMarkers] = React.useState<
    { id: number; marker: mapboxgl.Marker }[]
  >([]);
  const mapRef = React.useRef<HTMLDivElement>(null);

  const map = useMapbox(mapRef, mapState.accessToken, {
    center: mapState.latLng,
    zoom: mapState.zoom,
    style: mapState.style.url,
  });

  const updateNodes = React.useCallback(() => {
    nodes.map((node) => {
      if (map?.loaded() && node.currentPosition) {
        const existingMarker = markers.find(
          (marker) => marker.id === node.number,
        )?.marker;
        const marker =
          existingMarker ??
          new mapboxgl.Marker({}).setLngLat([0, 0]).addTo(map);

        marker
          .setLngLat([
            node.currentPosition.longitudeI / 1e7,
            node.currentPosition.latitudeI / 1e7,
          ])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              renderToString(
                <Card>
                  <div className="text-xl font-medium">
                    {node.user?.longName}
                  </div>
                  <ul>
                    <li>ID: {node.number}</li>
                  </ul>
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
        }
      }
    });
  }, [markers, map, nodes]);

  const ChangeMapStyle = React.useCallback(
    (styleName: string, style: MapStyle) => {
      dispatch(
        setMapStyle(
          mapState.style.title === styleName
            ? darkMode
              ? MapStyles.Dark
              : MapStyles.Light
            : style,
        ),
      );
    },
    [dispatch, darkMode, mapState.style.title],
  );

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
  }, [dispatch, map, updateNodes, mapState.exaggeration]);

  React.useEffect(() => {
    const center = map?.getCenter();
    if (center !== mapState.latLng) {
      map?.setCenter(mapState.latLng);
    }
  }, [map, mapState.latLng]);

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
    <div className="relative flex w-full h-full">
      <div className="fixed right-0 z-20 p-2 m-4 space-y-2 bg-white rounded-md shadow-md md:mx-10 dark:bg-primaryDark">
        <IconButton
          active={mapState.style.title === 'Satellite'}
          onClick={(): void => {
            ChangeMapStyle('Satellite', MapStyles.Satellite);
          }}
          icon={<FaGlobeAfrica />}
        />

        <div
          className={`p-1 -m-1 space-y-2 border-gray-400 rounded-md dark:border-gray-200 ${
            mapState.style.title === 'Outdoors' ? 'border' : ''
          }`}
        >
          <IconButton
            active={mapState.style.title === 'Outdoors'}
            onClick={(): void => {
              ChangeMapStyle('Outdoors', MapStyles.Outdoors);
            }}
            icon={<FaDirections />}
          />
          {mapState.style.title === 'Outdoors' && (
            <IconButton
              active={mapState.hillShade}
              onClick={(): void => {
                dispatch(setHillShade(!mapState.hillShade));
              }}
              icon={<MdWbShade />}
            />
          )}
        </div>

        <hr className="text-gray-400 dark:text-gray-200" />
        <IconButton
          active={mapState.exaggeration}
          onClick={(): void => {
            dispatch(setExaggeration(!mapState.exaggeration));
          }}
          icon={<FaMountain />}
        />
        <IconButton icon={<MdFullscreen />} />
        <IconButton icon={<MdRadar />} />
      </div>
      <div className="flex w-full h-full">
        <div className="flex-grow w-full h-full" ref={mapRef} />
      </div>
    </div>
  );
};
