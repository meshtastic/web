import React from 'react';

import { FaDirections, FaGlobeAfrica, FaMountain } from 'react-icons/fa';
import { MdFullscreen, MdRadar, MdWbShade } from 'react-icons/md';

import {
  setExaggeration,
  setHillShade,
  setMapStyle,
} from '@core/slices/mapSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { useMapbox } from '@hooks/useMapbox';
import { IconButton } from '@meshtastic/components';

import type { MapStyle } from './styles';
import { MapStyles } from './styles';

export const MapContainer = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.app.darkMode);

  const mapState = useAppSelector((state) => state.map);

  const { ref } = useMapbox();

  const ChangeMapStyle = React.useCallback(
    (styleName: string, style: MapStyle) => {
      dispatch(
        setMapStyle(
          mapState.style === styleName
            ? darkMode
              ? 'Dark'
              : 'Light'
            : style.title,
        ),
      );
    },
    [dispatch, darkMode, mapState.style],
  );

  return (
    <div
      className="relative flex h-full w-full"
      onContextMenu={(e): void => {
        e.stopPropagation();
      }}
    >
      <div className="absolute right-0 z-10 m-4 space-y-2 rounded-md border border-gray-300 bg-white p-2 shadow-md dark:border-gray-600 dark:bg-primaryDark">
        <IconButton
          active={mapState.style === 'Satellite'}
          onClick={(): void => {
            ChangeMapStyle('Satellite', MapStyles.Satellite);
          }}
          icon={<FaGlobeAfrica />}
        />

        <div
          className={`-m-1 space-y-2 rounded-md border-gray-300 p-1 dark:border-gray-600 ${
            mapState.style === 'Outdoors' ? 'border' : ''
          }`}
        >
          <IconButton
            active={mapState.style === 'Outdoors'}
            onClick={(): void => {
              ChangeMapStyle('Outdoors', MapStyles.Outdoors);
            }}
            icon={<FaDirections />}
          />
          {mapState.style === 'Outdoors' && (
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
      <div className="h-full w-full flex-grow" ref={ref} />
    </div>
  );
};
