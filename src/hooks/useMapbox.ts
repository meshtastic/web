import React from 'react';

import type { MapboxContextValue } from '@components/MapBox/mapboxContext';
import { MapboxContext } from '@components/MapBox/mapboxContext';

export const useMapbox = (): MapboxContextValue => {
  return React.useContext(MapboxContext);
};
