import 'mapbox-gl/dist/mapbox-gl.css';

import React from 'react';

import mapboxgl from 'mapbox-gl';
import { renderToString } from 'react-dom/server';
import { FaDirections, FaGlobeAfrica, FaMountain } from 'react-icons/fa';
import { MdFullscreen, MdRadar, MdWbShade } from 'react-icons/md';

import { useAppSelector } from '@app/hooks/redux';
import { IconButton } from '@components/generic/IconButton';

import { MapStyles } from './styles';

export const Map = (): JSX.Element => {
  const darkMode = useAppSelector((state) => state.app.darkMode);
  const nodes = useAppSelector((state) => state.meshtastic.nodes);

  mapboxgl.accessToken =
    'pk.eyJ1Ijoic2FjaGF3IiwiYSI6ImNrNW9meXozZjBsdW0zbHBjM2FnNnV6cmsifQ.3E4n8eFGD9ZOFo-XDVeZnQ';
  const mapDiv = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState(null as mapboxgl.Map | null);
  const [exaggeration, setExaggeration] = React.useState(false);
  const [shading, setShading] = React.useState(false);
  const [maptype, setMaptype] = React.useState<
    'Streets' | 'Outdoors' | 'Satellite' | 'Default'
  >('Default');

  const PlaceNodes = (): void => {
    nodes.map((node) => {
      if (node.currentPosition && map) {
        new mapboxgl.Marker({})
          .setLngLat({
            lat: node.currentPosition?.latitudeI / 1e7,
            lng: node.currentPosition?.longitudeI / 1e7,
          })
          .setPopup(
            new mapboxgl.Popup().setHTML(
              renderToString(
                <div>
                  <div className="text-xl font-medium">
                    {node.user?.longName}
                  </div>
                  <ul>
                    <li>ID: {node.number}</li>
                  </ul>
                </div>,
              ),
            ),
          )
          .addTo(map);
      }
    });
  };

  React.useEffect(() => {
    PlaceNodes();
  }, [nodes]);

  React.useEffect(() => {
    if (map?.loaded()) {
      switch (maptype) {
        case 'Outdoors':
          map.setStyle(MapStyles.Outdoors.url);
          break;

        case 'Satellite':
          map.setStyle(MapStyles.Satellite.url);
          break;

        case 'Streets':
          map.setStyle(MapStyles.Streets.url);
          break;

        default:
          map.setStyle(darkMode ? MapStyles.Dark.url : MapStyles.Light.url);
          break;
      }
    }
  }, [maptype, darkMode, map]);

  React.useEffect(() => {
    if (map?.loaded()) {
      if (shading) {
        map
          .addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          })
          .addLayer(
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
  }, [shading, map]);

  React.useEffect(() => {
    if (map?.loaded()) {
      if (exaggeration) {
        map
          .addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          })
          .setTerrain({
            source: 'mapbox-dem',
            exaggeration: 1.5,
          });
      } else {
        map.setTerrain();
      }
    }
  }, [exaggeration, map]);

  React.useEffect(() => {
    if (!map && mapDiv.current) {
      const map = new mapboxgl.Map({
        container: mapDiv.current,
        style: darkMode ? MapStyles.Dark.url : MapStyles.Light.url,
        // center: [lng, lat],
        // zoom: zoom,
      });
      setMap(map);

      map.on('load', () => {
        map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        });
        PlaceNodes();
      });
    }
  }, [map, darkMode]);

  return (
    <div className="relative flex w-full h-full">
      <div className="fixed right-0 z-20 p-2 m-4 space-y-2 bg-white rounded-md shadow-md md:mx-10 dark:bg-primaryDark">
        <IconButton
          active={maptype === 'Satellite'}
          onClick={(): void => {
            if (maptype === 'Satellite') {
              setMaptype('Default');
            } else {
              setMaptype('Satellite');
            }
          }}
          icon={<FaGlobeAfrica />}
        />

        <div
          className={`p-1 -m-1 space-y-2 border-gray-400 rounded-md dark:border-gray-200 ${
            maptype === 'Outdoors' ? 'border' : ''
          }`}
        >
          <IconButton
            active={maptype === 'Outdoors'}
            onClick={(): void => {
              if (maptype === 'Outdoors') {
                setMaptype('Default');
              } else {
                setMaptype('Outdoors');
              }
            }}
            icon={<FaDirections />}
          />
          {maptype === 'Outdoors' && (
            <IconButton
              active={shading}
              onClick={(): void => {
                setShading(!shading);
              }}
              icon={<MdWbShade />}
            />
          )}
        </div>

        <hr className="text-gray-400 dark:text-gray-200" />
        <IconButton
          active={exaggeration}
          onClick={(): void => {
            setExaggeration(!exaggeration);
          }}
          icon={<FaMountain />}
        />
        <IconButton icon={<MdFullscreen />} />
        <IconButton icon={<MdRadar />} />
      </div>
      <div className="flex w-full h-full">
        <div className="flex-grow w-full h-full" ref={mapDiv} />
      </div>
    </div>
  );
};
