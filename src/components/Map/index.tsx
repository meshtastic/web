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

export const Map = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((state) => state.app.darkMode);

  const mapState = useAppSelector((state) => state.map);

  const { ref } = useMapbox();

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

  return (
    <div className="relative flex w-full h-full">
      <div className="absolute right-0 z-20 p-2 m-4 space-y-2 bg-white border border-gray-300 rounded-md shadow-md dark:bg-primaryDark dark:border-gray-600">
        <IconButton
          active={mapState.style.title === 'Satellite'}
          onClick={(): void => {
            ChangeMapStyle('Satellite', MapStyles.Satellite);
          }}
          icon={<FaGlobeAfrica />}
        />

        <div
          className={`p-1 -m-1 space-y-2 rounded-md border-gray-300 dark:border-gray-600 ${
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
      <div className="flex-grow w-full h-full" ref={ref} />
    </div>
  );
};
